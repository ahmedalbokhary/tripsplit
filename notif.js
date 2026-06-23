(function(){
  var U='https://hisdnziwdlegxririysw.supabase.co';
  var K='sb_publishable__pb6Mhd4LtoFtGm2rChzRg_4vJR4KKt';
  var EMER='#1e6fd9';
  var BELL='<svg viewBox="0 0 24 24"><path d="M12 22a2.4 2.4 0 0 0 2.4-2h-4.8a2.4 2.4 0 0 0 2.4 2zm6-6v-5a6 6 0 0 0-5-5.91V4a1 1 0 1 0-2 0v1.09A6 6 0 0 0 6 11v5l-1.7 1.7A1 1 0 0 0 5 19h14a1 1 0 0 0 .7-1.71L18 16z"/></svg>';
  var RCPT='<svg viewBox="0 0 24 24"><path d="M6 2a1 1 0 0 0-1 1v18l2-1 2 1 2-1 2 1 2-1 2 1V3a1 1 0 0 0-1-1H6zm2 5h8v2H8V7zm0 4h8v2H8v-2z"/></svg>';
  function injectStyle(){
    if(document.getElementById('bt-style'))return;
    var s=document.createElement('style'); s.id='bt-style';
    s.textContent='#bt-bell{position:fixed;top:9px;right:max(12px,calc(50vw - 250px));z-index:99998;width:38px;height:38px;border-radius:50%;background:'+EMER+';display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.25);}'
    +'#bt-bell svg{width:20px;height:20px;fill:#fff;}'
    +'#bt-badge{position:absolute;top:-3px;right:-3px;min-width:18px;height:18px;padding:0 4px;border-radius:9px;background:#e23b3b;color:#fff;font:600 11px/18px -apple-system,Segoe UI,Arial,sans-serif;text-align:center;display:none;box-sizing:border-box;}'
    +'#bt-panel{position:fixed;top:54px;right:max(10px,calc(50vw - 252px));z-index:99999;width:300px;max-width:92vw;max-height:70vh;overflow:auto;background:#fff;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.28);display:none;font:400 14px/1.4 -apple-system,Segoe UI,Roboto,Arial,sans-serif;}'
    +'#bt-panel h4{margin:0;padding:12px 14px;font-size:15px;font-weight:600;color:'+EMER+';border-bottom:1px solid #eee;position:sticky;top:0;background:#fff;}'
    +'.bt-item{padding:10px 14px;border-bottom:1px solid #f2f2f2;display:flex;gap:10px;align-items:flex-start;}'
    +'.bt-item .ic{flex:0 0 auto;width:30px;height:30px;border-radius:8px;background:#e7f5ef;display:flex;align-items:center;justify-content:center;}'
    +'.bt-item .ic svg{width:16px;height:16px;fill:'+EMER+';}'
    +'.bt-item .t1{font-weight:500;color:#14241f;}'
    +'.bt-item .t2{font-size:12px;color:#6b7a74;margin-top:2px;}'
    +'.bt-empty{padding:26px 14px;text-align:center;color:#999;}'
    +'#bt-banner{position:fixed;left:50%;top:56px;transform:translateX(-50%);z-index:99997;max-width:90%;background:'+EMER+';color:#fff;padding:11px 15px;border-radius:12px;box-shadow:0 6px 20px rgba(0,0,0,.25);font:500 14px/1.4 -apple-system,Segoe UI,Roboto,Arial,sans-serif;cursor:pointer;text-align:center;display:none;}';
    document.head.appendChild(s);
  }
  var E={}, items=[], lastSeen=0, SEEN='', open=false;
  function esc(s){ s=String(s==null?'':s); return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function fmtDate(iso){ try{var d=new Date(iso); return d.toLocaleDateString([],{month:'short',day:'numeric'})+' '+d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});}catch(e){return '';} }
  function badge(){ var n=0; for(var i=0;i<items.length;i++) if(items[i].when>lastSeen) n++; if(n>0){E.badge.textContent=n>99?'99+':(''+n); E.badge.style.display='block';} else E.badge.style.display='none'; }
  function list(){ if(!items.length){E.list.innerHTML='<div class=\"bt-empty\">No notifications yet</div>';return;} var h=''; for(var i=0;i<items.length;i++){var it=items[i]; h+='<div class=\"bt-item\"><div class=\"ic\">'+RCPT+'</div><div><div class=\"t1\">'+esc(it.who)+' added '+esc(it.amount)+' '+esc(it.cur)+'</div><div class=\"t2\">'+esc(it.desc||'expense')+' \u00b7 '+esc(it.trip)+' \u00b7 '+it.date+'</div></div></div>';} E.list.innerHTML=h; }
  function toggle(){ open=!open; if(open){ list(); E.panel.style.display='block'; lastSeen=Date.now(); try{localStorage.setItem(SEEN,''+lastSeen);}catch(e){} badge(); } else E.panel.style.display='none'; }
  function showBanner(t){ E.banner.textContent=t; E.banner.style.display='block'; clearTimeout(E.banner._t); E.banner._t=setTimeout(function(){E.banner.style.display='none';},6000); }
  function build(){ injectStyle(); if(document.getElementById('bt-bell'))return; var bell=document.createElement('div'); bell.id='bt-bell'; bell.innerHTML=BELL+'<span id=\"bt-badge\"></span>'; var panel=document.createElement('div'); panel.id='bt-panel'; panel.innerHTML='<h4>Notifications</h4><div id=\"bt-list\"></div>'; var banner=document.createElement('div'); banner.id='bt-banner'; banner.onclick=function(){banner.style.display='none';}; document.body.appendChild(bell); document.body.appendChild(panel); document.body.appendChild(banner); E.bell=bell; E.badge=document.getElementById('bt-badge'); E.panel=panel; E.list=document.getElementById('bt-list'); E.banner=banner; bell.onclick=function(ev){ev.stopPropagation();toggle();}; document.addEventListener('click',function(e){ if(open && !panel.contains(e.target) && e.target!==bell && !bell.contains(e.target)){ open=false; panel.style.display='none'; } }); }
  function storedSession(){ try{ for(var i=0;i<localStorage.length;i++){ var k=localStorage.key(i); if(k&&k.indexOf('-auth-token')>-1){ var v=JSON.parse(localStorage.getItem(k)); var ss=(v&&v.access_token)?v:(v&&v.currentSession); if(ss&&ss.access_token)return ss; } } }catch(e){} return null; }
  function start(){
    if(!window.supabase||!window.supabase.createClient) return setTimeout(start,500);
    var ss=storedSession(); if(!ss||!ss.access_token) return setTimeout(start,800);
    var sb=window.supabase.createClient(U,K); var myUid=(ss.user&&ss.user.id)||null;
    try{sb.realtime.setAuth(ss.access_token);}catch(e){}
    SEEN='bt-seen-'+myUid; lastSeen=parseInt(localStorage.getItem(SEEN)||'0',10)||0;
    build(); badge();
    var mC={},tC={};
    function amt(a){var n=Number(a);return isFinite(n)?n:a;}
    async function mem(id){ if(id in mC)return mC[id]; try{var r=await sb.from('members').select('name').eq('id',id).single(); mC[id]=(r&&r.data)?(r.data.name||null):null;}catch(_){mC[id]=null;} return mC[id]; }
    async function trip(id){ if(id in tC)return tC[id]; try{var r=await sb.from('trips').select('currency,name').eq('id',id).single(); tC[id]=(r&&r.data)?r.data:null;}catch(_){tC[id]=null;} return tC[id]; }
    async function toItem(e){ var nm=await mem(e.paid_by); if(nm===null)return null; var ti=await trip(e.trip_id)||{}; return {when:new Date(e.created_at).getTime()||0, who:nm, amount:amt(e.amount), cur:ti.currency||'EGP', desc:e.description, trip:ti.name||'', date:fmtDate(e.created_at)}; }
    async function onIns(p){ try{ var e=p&&p.new; if(!e)return; if(myUid&&e.added_by&&e.added_by===myUid)return; var it=await toItem(e); if(!it)return; items.unshift(it); badge(); if(open)list(); showBanner(it.who+' added '+it.amount+' '+it.cur+(it.desc?(' for '+it.desc):'')); }catch(_){} }
    async function initial(){ try{ var q=await sb.from('expenses').select('amount,description,trip_id,paid_by,added_by,created_at').order('created_at',{ascending:false}).limit(50); if(!q||!q.data)return; for(var i=0;i<q.data.length;i++){ var e=q.data[i]; if(myUid&&e.added_by&&e.added_by===myUid)continue; var it=await toItem(e); if(it)items.push(it); } badge(); if(open)list(); }catch(_){} }
    sb.channel('bt-notif').on('postgres_changes',{event:'INSERT',schema:'public',table:'expenses'},onIns).subscribe();
    initial();
  }
  start();
})();
