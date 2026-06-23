(function(){
  var U='https://hisdnziwdlegxririysw.supabase.co';
  var K='sb_publishable__pb6Mhd4LtoFtGm2rChzRg_4vJR4KKt';
  function injectStyle(){
    if(document.getElementById('bt-style'))return;
    var s=document.createElement('style'); s.id='bt-style';
    s.textContent='@keyframes bt-marq{0%{transform:translateX(100%)}100%{transform:translateX(-100%)}}#bt-ticker{position:fixed;left:0;right:0;top:0;z-index:99998;background:#0b7a57;color:#fff;height:34px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.2);cursor:pointer;}#bt-ticker .bt-track{display:inline-block;white-space:nowrap;padding-left:100%;font:500 14px/34px -apple-system,Segoe UI,Roboto,Arial,sans-serif;animation:bt-marq 20s linear infinite;}#bt-ticker:hover .bt-track{animation-play-state:paused;}';
    document.head.appendChild(s);
  }
  function banner(text){
    try{
      var el=document.getElementById('bt-banner');
      if(!el){ el=document.createElement('div'); el.id='bt-banner';
        el.style.cssText='position:fixed;left:50%;top:44px;transform:translateX(-50%);z-index:99999;max-width:92%;background:#0b7a57;color:#fff;padding:12px 16px;border-radius:12px;box-shadow:0 6px 20px rgba(0,0,0,.25);font:500 14px/1.45 -apple-system,Segoe UI,Roboto,Arial,sans-serif;cursor:pointer;text-align:center;';
        el.onclick=function(){el.style.display='none';}; document.body.appendChild(el); }
      el.textContent=text; el.style.display='block';
      clearTimeout(el._t); el._t=setTimeout(function(){el.style.display='none';},6000);
    }catch(e){}
  }
  function ticker(items){
    try{
      if(!items||!items.length)return; injectStyle();
      var el=document.getElementById('bt-ticker');
      if(!el){ el=document.createElement('div'); el.id='bt-ticker'; el.onclick=function(){el.style.display='none';}; document.body.appendChild(el); }
      var track=document.createElement('div'); track.className='bt-track';
      track.textContent='Recent:     '+items.join('       \u2022       ')+'       \u2022       ';
      el.innerHTML=''; el.appendChild(track); el.style.display='block';
      clearTimeout(el._t); el._t=setTimeout(function(){el.style.display='none';},30000);
    }catch(e){}
  }
  function storedSession(){
    try{ for(var i=0;i<localStorage.length;i++){ var k=localStorage.key(i);
      if(k&&k.indexOf('-auth-token')>-1){ var v=JSON.parse(localStorage.getItem(k)); var ss=(v&&v.access_token)?v:(v&&v.currentSession); if(ss&&ss.access_token)return ss; } } }catch(e){}
    return null;
  }
  function start(){
    if(!window.supabase||!window.supabase.createClient){return setTimeout(start,500);}
    var ss=storedSession(); if(!ss||!ss.access_token){return setTimeout(start,800);}
    var sb=window.supabase.createClient(U,K);
    var myUid=(ss.user&&ss.user.id)||null;
    try{sb.realtime.setAuth(ss.access_token);}catch(e){}
    var mC={}, tC={};
    function amt(a){var n=Number(a);return isFinite(n)?n:a;}
    async function memName(id){ if(id in mC)return mC[id]; try{var r=await sb.from('members').select('name').eq('id',id).single(); mC[id]=(r&&r.data)?(r.data.name||null):null;}catch(_){mC[id]=null;} return mC[id]; }
    async function tripInfo(id){ if(id in tC)return tC[id]; try{var r=await sb.from('trips').select('currency,name').eq('id',id).single(); tC[id]=(r&&r.data)?r.data:null;}catch(_){tC[id]=null;} return tC[id]; }
    async function describe(e){ var nm=await memName(e.paid_by); if(nm===null)return null; var ti=await tripInfo(e.trip_id)||{}; var cur=ti.currency||'EGP'; var tn=ti.name||''; return (tn?tn+': ':'')+nm+' added '+amt(e.amount)+' '+cur+(e.description?(' for '+e.description):''); }
    async function onIns(payload){ try{ var e=payload&&payload.new; if(!e)return; if(myUid&&e.added_by&&e.added_by===myUid)return; var t=await describe(e); if(t)banner(t); }catch(err){} }
    async function recap(){ try{
      var q=await sb.from('expenses').select('amount,description,trip_id,paid_by,added_by,created_at').order('created_at',{ascending:false}).limit(15);
      if(!q||!q.data||!q.data.length)return; var items=[];
      for(var i=0;i<q.data.length;i++){ var e=q.data[i]; if(myUid&&e.added_by&&e.added_by===myUid)continue; var t=await describe(e); if(t)items.push(t); if(items.length>=8)break; }
      ticker(items);
    }catch(err){} }
    sb.channel('bt-notif').on('postgres_changes',{event:'INSERT',schema:'public',table:'expenses'},onIns).subscribe();
    recap();
  }
  start();
})();
