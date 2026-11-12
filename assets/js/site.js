(function(){
'use strict';
var PHONE=/^(?:\+972|972|0)(?:5\d|[23489]|7\d)\d{7}$/;
var FAIL='לא הצלחנו לשלוח את הפנייה. אפשר להתקשר אלינו ל-054-3443334 או לנסות שוב בעוד רגע.';
/* mobile menu */
var btn=document.getElementById('m-nav-btn'),nav=document.getElementById('m-nav');
if(btn&&nav){
  var set=function(o,f){nav.hidden=!o;btn.setAttribute('aria-expanded',o?'true':'false');if(!o&&f)btn.focus();};
  btn.addEventListener('click',function(){set(nav.hidden);});
  nav.addEventListener('click',function(e){if(e.target.closest('a'))set(false);});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!nav.hidden)set(false,true);});
  document.addEventListener('click',function(e){if(!nav.hidden&&!nav.contains(e.target)&&!btn.contains(e.target))set(false);});
  window.addEventListener('resize',function(){if(window.innerWidth>=1024)set(false);});
}
/* contact forms */
var NAME=/^[\p{L}][\p{L}\s'"׳״.\-]{1,39}$/u;
function newId(){try{if(window.crypto&&crypto.randomUUID)return crypto.randomUUID();}catch(e){}return String(Date.now())+Math.random().toString(16).slice(2);}
[].forEach.call(document.querySelectorAll('[data-contact-form]'),function(form){
  var status=form.querySelector('.form-status'),submit=form.querySelector('[type="submit"]'),busy=false,sent=false,sid=newId();
  var first=form.querySelector('input[name="firstName"]'),last=form.querySelector('input[name="lastName"]'),phone=form.querySelector('input[name="phone"]'),hp=form.querySelector('input[name="contact_hp"]');
  function show(kind,msg){status.className='form-status is-'+kind;status.textContent=msg;}
  function bad(el,msg){el.setAttribute('aria-invalid','true');show('error',msg);el.focus();}
  form.addEventListener('input',function(){sent=false;});
  form.addEventListener('submit',function(e){
    e.preventDefault(); if(busy||sent)return;
    [first,last,phone].forEach(function(el){el.removeAttribute('aria-invalid');});
    var f=first.value.trim(),l=last.value.trim(),p=phone.value.replace(/[\s\-().]/g,'');
    if(!NAME.test(f))return bad(first,'נא למלא שם פרטי.');
    if(!NAME.test(l))return bad(last,'נא למלא שם משפחה.');
    if(!PHONE.test(p))return bad(phone,'מספר הטלפון אינו תקין. למשל: 050-1234567.');
    busy=true;submit.setAttribute('aria-disabled','true');show('busy','שולח…');
    var ctl=window.AbortController?new AbortController():null,t=setTimeout(function(){if(ctl)ctl.abort();},15000);
    fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({firstName:f,lastName:l,phone:p,hp:hp?hp.value:'',source:form.getAttribute('data-contact-form'),submissionId:sid}),signal:ctl?ctl.signal:undefined})
    .then(function(r){return r.json().catch(function(){return {};}).then(function(j){return {ok:r.ok&&j.ok===true,status:r.status};});})
    .then(function(r){
      if(r.ok){form.reset();sid=newId();sent=true;show('ok','הפנייה נשלחה בהצלחה. ניצור איתך קשר בהקדם');}
      else if(r.status===400)show('error','בדקו את הפרטים שהוזנו ונסו שוב.');
      else if(r.status===429)show('error','נשלחו יותר מדי פניות. נסו שוב בעוד כמה דקות, או התקשרו ל-054-3443334.');
      else show('error',FAIL);
    })
    .catch(function(){show('error',FAIL);})
    .then(function(){clearTimeout(t);busy=false;submit.removeAttribute('aria-disabled');});
  });
});
})();
