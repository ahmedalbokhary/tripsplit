(function(){
  var U='https://hisdnziwdlegxririysw.supabase.co';
  var K='sb_publishable__pb6Mhd4LtoFtGm2rChzRg_4vJR4KKt';
  function banner(text){
    try{
      var el=document.getElementById('bt-banner');
      if(!el){
        el=document.createElement('div');
        el.id='bt-banner';
        el.style.cssText='position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:99999;max-width:92%;background:#0b7a57;color:#fff;padding:12px 16px;border-radius:12px;box-shadow:0 6px 20px rgba(0,0,0,.25);font:500 14px/1.45 -apple-system,Segoe UI,Roboto,Arial,sans-serif;cursor:pointer;text-align:center;';
        el.onclick=function(){el.style.display='none';};
        document.body.appendChild(el);
      }
      el.textContent=text;
      el.style.display='block';
      clearTimeout(el._t);
      el._t=setTimeout(function(){el.style.display='none';},6000);
    }catch(e){}
  }
  function start(){
    if(!window.supabase||!window.supabase.createClient){return setTimeout(start,500);}
    var sb=window.supabase.createClient(U,K);
    var myUid=null;
    function setUid(s){try{if(s&&s.user){myUid=s.user.id;sb.realtime.setAuth(s.access_token);}}catch(e){}}
    async function onIns(payload){
      try{
        var e=payload&&payload.new; if(!e)return;
        if(myUid&&e.added_by&&e.added_by===myUid)return;
        var r=null;
        try{r=await sb.from('members').select('name').eq('id',e.paid_by).single();}catch(_){}
        if(!r||!r.data)return;
        var who=r.data.name||'Someone';
        var cur='EGP';
        try{var rt=await sb.from('trips').select('currency').eq('id',e.trip_id).single(); if(rt&&rt.data&&rt.data.currency)cur=rt.data.currency;}catch(_){}
        var amt=Number(e.amount); if(!isFinite(amt))amt=e.amount;
        banner(who+' added '+amt+' '+cur+(e.description?(' for '+e.description):''));
      }catch(err){}
    }
    (async function(){
      var tok=null,uid=null;for(var _i=0;_i<40 && !tok;_i++){try{for(var j=0;j<localStorage.length;j++){var kk=localStorage.key(j);if(kk&&kk.indexOf("-auth-token")>-1){var vv=JSON.parse(localStorage.getItem(kk));var ssn=(vv&&vv.access_token)?vv:(vv&&vv.currentSession);if(ssn&&ssn.access_token){tok=ssn.access_token;uid=(ssn.user&&ssn.user.id)||null;}}}}catch(_){}if(!tok)await new Promise(function(rr){setTimeout(rr,500);});}if(tok){myUid=uid;try{sb.realtime.setAuth(tok);}catch(_){}}
      sb.auth.onAuthStateChange(function(_e,sess){setUid(sess);});
      sb.channel('bt-notif').on('postgres_changes',{event:'INSERT',schema:'public',table:'expenses'},onIns).subscribe();
    })();
  }
  start();
})();
