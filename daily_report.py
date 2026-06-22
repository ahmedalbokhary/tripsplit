#!/usr/bin/env python3
"""
Bokha tripsplit - daily summary report (PDF).
Runs on a schedule (GitHub Actions). For every active trip it builds a clean PDF
summary and emails it to that trip's members who have an email address on file.

A trip is "active" when today is within its start_date .. end_date window
(inclusive). Trips with no dates set are treated as always active.

Email is sent from a Gmail using an "App Password" stored as a GitHub secret.
No password is ever stored in this file.
"""
import os, io, smtplib, datetime
from email.message import EmailMessage
import requests
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://hisdnziwdlegxririysw.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "sb_publishable__pb6Mhd4LtoFtGm2rChzRg_4vJR4KKt")
HEAD = {"apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY}

GMAIL_USER = os.environ.get("GMAIL_USER")
GMAIL_APP_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD")

BRAND = colors.HexColor("#0b7a57")
BRAND_LIGHT = colors.HexColor("#e6f7ef")
INK = colors.HexColor("#142019")
MUTE = colors.HexColor("#667a72")


def fetch(table, trip_id):
    r = requests.get(f"{SUPABASE_URL}/rest/v1/{table}",
                     headers=HEAD, params={"trip_id": f"eq.{trip_id}", "select": "*"})
    r.raise_for_status()
    return r.json()


def compute_balances(members, expenses, settlements):
    net = {m["id"]: 0.0 for m in members}
    for e in expenses:
        amt = float(e["amount"] or 0)
        if e["paid_by"] in net:
            net[e["paid_by"]] += amt
        for m in members:
            net[m["id"]] -= amt * float(m.get("percent") or 0) / 100.0
    for s in settlements:
        amt = float(s["amount"] or 0)
        if s["from_member"] in net:
            net[s["from_member"]] += amt
        if s["to_member"] in net:
            net[s["to_member"]] -= amt
    return {k: round(v, 2) for k, v in net.items()}


def simplify(net):
    cred = sorted([[k, v] for k, v in net.items() if v > 0.005], key=lambda x: -x[1])
    debt = sorted([[k, -v] for k, v in net.items() if v < -0.005], key=lambda x: -x[1])
    out, i, j = [], 0, 0
    while i < len(debt) and j < len(cred):
        pay = round(min(debt[i][1], cred[j][1]), 2)
        out.append((debt[i][0], cred[j][0], pay))
        debt[i][1] -= pay
        cred[j][1] -= pay
        if debt[i][1] < 0.005:
            i += 1
        if cred[j][1] < 0.005:
            j += 1
    return out


def money(v, cur):
    return f"{cur} {float(v):,.2f}"


def build_pdf(trip, members, expenses, settlements):
    cur = trip.get("currency") or "EGP"
    name_of = {m["id"]: m["name"] for m in members}
    net = compute_balances(members, expenses, settlements)
    transfers = simplify(net)
    total = sum(float(e["amount"]) for e in expenses)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=18 * mm, bottomMargin=16 * mm,
                            leftMargin=16 * mm, rightMargin=16 * mm, title=f"{trip['name']} summary")
    ss = getSampleStyleSheet()
    h_brand = ParagraphStyle("brand", parent=ss["Normal"], fontName="Helvetica-Bold",
                             fontSize=16, textColor=BRAND, spaceAfter=2)
    h_title = ParagraphStyle("title", parent=ss["Normal"], fontName="Helvetica-Bold",
                             fontSize=20, textColor=INK, spaceAfter=2)
    sub = ParagraphStyle("sub", parent=ss["Normal"], fontSize=10, textColor=MUTE, spaceAfter=1)
    sec = ParagraphStyle("sec", parent=ss["Normal"], fontName="Helvetica-Bold",
                         fontSize=12, textColor=BRAND, spaceBefore=14, spaceAfter=6)

    flow = []
    flow.append(Paragraph("Bokha tripsplit", h_brand))
    flow.append(Paragraph(trip["name"], h_title))
    dates = ""
    if trip.get("start_date") and trip.get("end_date"):
        dates = f"Trip: {trip['start_date']} to {trip['end_date']}   |   "
    flow.append(Paragraph(dates + f"Report date: {datetime.date.today().isoformat()}", sub))
    flow.append(Paragraph(f"Total spent: <b>{money(total, cur)}</b>", sub))

    def make_table(data, col_widths, header=True):
        t = Table(data, colWidths=col_widths, hAlign="LEFT")
        style = [
            ("FONT", (0, 0), (-1, -1), "Helvetica", 9.5),
            ("TEXTCOLOR", (0, 0), (-1, -1), INK),
            ("LINEBELOW", (0, 0), (-1, -2), 0.4, colors.HexColor("#e9eeeb")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ]
        if header:
            style += [
                ("BACKGROUND", (0, 0), (-1, 0), BRAND),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 9.5),
            ]
        t.setStyle(TableStyle(style))
        return t

    flow.append(Paragraph("Members &amp; balances", sec))
    rows = [["Member", "Share %", "Net balance"]]
    for m in members:
        v = net.get(m["id"], 0)
        bal = "settled" if abs(v) <= 0.005 else (("owes " if v < 0 else "is owed ") + money(abs(v), cur))
        rows.append([m["name"], f"{float(m.get('percent') or 0):g}%", bal])
    flow.append(make_table(rows, [70 * mm, 35 * mm, 73 * mm]))

    flow.append(Paragraph("Who owes whom", sec))
    if not transfers:
        flow.append(Paragraph("All settled up.", sub))
    else:
        rows = [["From", "To", "Amount"]]
        for frm, to, amt in transfers:
            rows.append([name_of.get(frm, "?"), name_of.get(to, "?"), money(amt, cur)])
        flow.append(make_table(rows, [65 * mm, 65 * mm, 48 * mm]))

    flow.append(Paragraph("Expenses", sec))
    rows = [["Date", "Description", "Category", "Paid by", "Amount"]]
    for e in sorted(expenses, key=lambda x: (x.get("spent_on") or ""), reverse=True):
        rows.append([e.get("spent_on") or "", e.get("description") or "",
                     e.get("category") or "-", name_of.get(e.get("paid_by"), "?"),
                     money(e["amount"], cur)])
    flow.append(make_table(rows, [22 * mm, 56 * mm, 24 * mm, 30 * mm, 46 * mm]))

    flow.append(Spacer(1, 14))
    flow.append(Paragraph("Sent automatically by Bokha tripsplit.", sub))

    doc.build(flow)
    return buf.getvalue(), total, transfers, name_of, cur


def send_email(recipients, trip_name, pdf_bytes, body_text):
    msg = EmailMessage()
    msg["Subject"] = f"Bokha tripsplit - daily summary: {trip_name} ({datetime.date.today().isoformat()})"
    msg["From"] = f"Bokha tripsplit <{GMAIL_USER}>"
    msg["To"] = GMAIL_USER
    msg["Bcc"] = ", ".join(recipients)
    msg.set_content(body_text)
    fname = f"{trip_name.replace(' ', '_')}_summary_{datetime.date.today().isoformat()}.pdf"
    msg.add_attachment(pdf_bytes, maintype="application", subtype="pdf", filename=fname)
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as s:
        s.login(GMAIL_USER, GMAIL_APP_PASSWORD)
        s.send_message(msg)


def cairo_now():
    try:
        from zoneinfo import ZoneInfo
        return datetime.datetime.now(ZoneInfo("Africa/Cairo"))
    except Exception:
        return datetime.datetime.utcnow()


def should_run():
    if os.environ.get("FORCE") == "1":
        return True
    return cairo_now().hour == 0


def in_window(trip, today_iso):
    s, e = trip.get("start_date"), trip.get("end_date")
    if s and today_iso < s:
        return False
    if e and today_iso > e:
        return False
    return True


def main():
    if not should_run():
        print("Not local midnight in Egypt - skipping this run.")
        return
    if not GMAIL_USER or not GMAIL_APP_PASSWORD:
        raise SystemExit("Missing GMAIL_USER / GMAIL_APP_PASSWORD secrets.")

    today_iso = cairo_now().date().isoformat()
    trips = requests.get(f"{SUPABASE_URL}/rest/v1/trips",
                         headers=HEAD, params={"select": "*"}).json()
    sent = 0
    for trip in trips:
        if not in_window(trip, today_iso):
            print(f"'{trip['name']}' is outside its trip dates - skipping.")
            continue
        members = fetch("members", trip["id"])
        expenses = fetch("expenses", trip["id"])
        settlements = fetch("settlements", trip["id"])
        recipients = [m["email"] for m in members if m.get("email")]
        if not recipients or not expenses:
            continue
        pdf, total, transfers, name_of, cur = build_pdf(trip, members, expenses, settlements)
        lines = [f"Daily summary for trip: {trip['name']}",
                 f"Total spent: {money(total, cur)}", "", "Who owes whom:"]
        if transfers:
            for frm, to, amt in transfers:
                lines.append(f"  {name_of.get(frm,'?')} -> {name_of.get(to,'?')}: {money(amt, cur)}")
        else:
            lines.append("  All settled up.")
        lines += ["", "The full report is attached as a PDF.", "", "- Bokha tripsplit"]
        send_email(recipients, trip["name"], pdf, "\n".join(lines))
        sent += 1
        print(f"Sent PDF for '{trip['name']}' to {len(recipients)} member(s).")
    print(f"Done. {sent} trip report(s) sent.")


if __name__ == "__main__":
    main()
