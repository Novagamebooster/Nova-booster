(function(){
  var PAY={usdt:"THp3evgPMkF7jiBJfYJEMbxz2wAaSq96aK",ton:"UQB2qCvXNegkNWLhvwtkaxG9fBR31ojEB41PKgwToOeMkmQe"};
  var SB={url:"https://bpveghqcmxblczvazuff.supabase.co",key:"sb_publishable_OM63vvx8fQhSwGFPfQb9Uw_szdybLKS"};
  var BASE=[2.99,7.99,23.99];
  var PPP={fa:1,en:1,tr:1,ar:1,tl:1};
  var state={plan:0,coin:"usdt",usd:0,code:"",orderId:null,tonAmt:0};

  function h(){return{apikey:SB.key,Authorization:"Bearer "+SB.key,"Content-Type":"application/json"};}

  window.openCheckout=function(i){
    state.plan=i;state.orderId=null;state.tonAmt=0;
    var card=document.querySelectorAll(".plan")[i];
    var planName=card?card.querySelector("h3").textContent:"";
    document.getElementById("pmPlan").textContent=planName+" — NOVA";
    var seq=(parseInt(localStorage.getItem("nova_seq")||"0",10)+1);
    try{localStorage.setItem("nova_seq",String(seq));}catch(e){}
    state.code="NV-"+Date.now().toString(36).slice(-4).toUpperCase()+seq;
    var lang=(window.NOVA_lang||"fa");
    state.usd=BASE[i]*(PPP[lang]||1)+seq/1e6;
    var ei=document.getElementById("pmEmail");
    if(ei){try{ei.value=localStorage.getItem("nova_email")||"";}catch(e){}}
    showMethods();
    document.getElementById("payModal").style.display="flex";
    createOrder(lang);
  };

  function showMethods(){
    document.getElementById("pmMethods").style.display="block";
    document.getElementById("pmCrypto").style.display="none";
    document.getElementById("pmZarin").style.display="none";
  }
  window.chooseMethod=function(m){
    document.getElementById("pmMethods").style.display="none";
    if(m==="zarin"){document.getElementById("pmZarin").style.display="block";}
    else{document.getElementById("pmCrypto").style.display="block";setCoin(m);}
  };
  window.backToMethods=showMethods;

  function setCoin(c){
    state.coin=c;
    document.getElementById("coinUSDT").classList.toggle("on",c==="usdt");
    document.getElementById("coinTON").classList.toggle("on",c==="ton");
    render();
  }
  window.setCoin=setCoin;

  function render(){
    var amt=document.getElementById("pmAmount"),adr=document.getElementById("pmAddr"),qr=document.getElementById("pmQr");
    document.getElementById("pmCode").textContent=state.code;
    if(state.coin==="usdt"){
      amt.textContent=state.usd.toFixed(6)+" USDT";
      adr.textContent=PAY.usdt;
      qr.src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data="+encodeURIComponent(PAY.usdt);
      sync();
    } else {
      amt.textContent="...";
      fetch("https://open.er-api.com/v6/latest/USD").then(function(r){return r.json();}).then(function(d){
        if(d&&d.rates&&d.rates.TON){
          var t=state.usd*d.rates.TON;state.tonAmt=t;
          amt.textContent=t.toFixed(6)+" TON";
          adr.textContent=PAY.ton;
          qr.src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data="+encodeURIComponent("ton://transfer/"+PAY.ton+"?amount="+Math.round(t*1e9));
          sync();
        } else amt.textContent="TON rate unavailable";
      }).catch(function(){amt.textContent="TON rate unavailable";});
    }
  }

  function createOrder(lang){
    var ei=document.getElementById("pmEmail");
    fetch(SB.url+"/rest/v1/orders",{method:"POST",headers:h(),body:JSON.stringify({
      code:state.code,plan:state.plan,coin:state.coin,
      amount_expected:state.usd,amount_text:state.usd.toFixed(6)+" USDT",
      email:(ei&&ei.value)||"",lang:lang,status:"pending"
    })}).then(function(r){return r.json();}).then(function(d){
      state.orderId=d&&d[0]?d[0].id:null;
    }).catch(function(e){console.error("createOrder",e);});
  }

  function sync(){
    if(!state.orderId)return;
    var b={coin:state.coin,amount_text:document.getElementById("pmAmount").textContent};
    b.amount_expected=(state.coin==="ton"&&state.tonAmt)?state.tonAmt:state.usd;
    fetch(SB.url+"/rest/v1/orders?id=eq."+state.orderId,{method:"PATCH",headers:h(),body:JSON.stringify(b)}).catch(function(){});
  }

  window.copyAddr=function(){
    var t=document.getElementById("pmAddr").textContent;
    var b=document.getElementById("pmCopy");
    var done=function(){
      var L=window.I18N&&window.I18N[window.NOVA_lang||"fa"]||{};
      b.textContent=L.pay_copied||"Copied!";
      setTimeout(function(){b.textContent=L.pay_copy||"Copy";},1500);
    };
    if(navigator.clipboard)navigator.clipboard.writeText(t).then(done);
    else{var ta=document.createElement("textarea");ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand("copy");}catch(e){}ta.remove();done();}
  };

  window.paidClick=function(){
    var ei=document.getElementById("pmEmail");
    var em=ei?ei.value.trim():"";
    try{if(em)localStorage.setItem("nova_email",em);}catch(e){}
    if(state.orderId&&em)fetch(SB.url+"/rest/v1/orders?id=eq."+state.orderId,{method:"PATCH",headers:h(),body:JSON.stringify({email:em})}).catch(function(){});
    window.open("https://t.me/NovaBoosterSupport","_blank");
  };

  window.closeCheckout=function(){document.getElementById("payModal").style.display="none";};

  window.openTrack=function(){document.getElementById("trackModal").style.display="flex";document.getElementById("trackRes").innerHTML="";};
  window.closeTrack=function(){document.getElementById("trackModal").style.display="none";};
  window.doTrack=function(){
    var c=document.getElementById("trackIn").value.trim();
    var r=document.getElementById("trackRes");
    if(!c)return;r.innerHTML="...";
    var L=window.I18N&&window.I18N[window.NOVA_lang||"fa"]||{};
    fetch(SB.url+"/rest/v1/orders?code=eq."+encodeURIComponent(c)+"&select=*",{headers:h()}).then(function(x){return x.json();}).then(function(o){
      if(!o||!o.length){r.innerHTML=L.track_notfound||"Not found";return;}
      var ord=o[0];
      if(ord.status==="paid"){
        fetch(SB.url+"/rest/v1/licenses?order_id=eq."+ord.id+"&select=key",{headers:h()}).then(function(x){return x.json();}).then(function(l){
          r.innerHTML=(L.track_paid||"Paid")+' <b style="color:#10b981;direction:ltr;unicode-bidi:embed;display:block;margin-top:6px">'+(l&&l[0]?l[0].key:"—")+"</b>";
        });
      } else r.innerHTML=L.track_pending||"Pending";
    }).catch(function(){r.innerHTML=L.track_notfound||"Not found";});
  };

  document.addEventListener("click",function(e){
    if(e.target&&e.target.id==="payModal")window.closeCheckout();
    if(e.target&&e.target.id==="trackModal")window.closeTrack();
  });

  
var PL={
fa:{pay_method:"روش پرداخت",pm_zarin_title:"پرداخت ریالی (زرین‌پال)",pm_zarin_soon:"به‌زودی فعال می‌شه (در انتظار تأیید زرین‌پال). فعلاً: کریپتو یا پشتیبانی.",pm_back:"بازگشت",pay_email:"ایمیل (دریافت لایسنس)",pay_amount:"مبلغ دقیق (فقط همین سفارش)",pay_copy:"کپی",pay_copied:"کپی شد!",pay_paid:"پرداخت کردم — ارسال رسید",pay_order:"کد سفارش:",pay_note:"مبلغ یکتاست و فقط برای همین سفارش معتبره. بعد از واریز، کد سفارش و TXID رو به پشتیبانی بفرست.",pay_sub:"پرداخت با کریپتو — فعال‌سازی خودکار",track_title:"پیگیری سفارش",track_btn:"بررسی وضعیت",track_pending:"⏳ در انتظار پرداخت — لایسنس به‌صورت خودکار صادر می‌شه.",track_paid:"✅ پرداخت تأیید شد — لایسنس تو:",track_notfound:"سفارشی با این کد پیدا نشد."},
en:{pay_method:"Choose payment method",pm_zarin_title:"Rial payment (Zarinpal)",pm_zarin_soon:"Activates soon (pending Zarinpal approval). Meanwhile: crypto or support.",pm_back:"Back",pay_email:"Email (license delivery)",pay_amount:"Exact amount (this order only)",pay_copy:"Copy",pay_copied:"Copied!",pay_paid:"I paid — send receipt",pay_order:"Order code:",pay_note:"Amount is unique to this order. After payment, send order code + TXID to support.",pay_sub:"Crypto payment — auto activation",track_title:"Track order",track_btn:"Check status",track_pending:"⏳ Awaiting payment — license issues automatically.",track_paid:"✅ Payment confirmed — your license:",track_notfound:"No order found with this code."},
tr:{pay_method:"Ödeme yöntemi seç",pm_zarin_title:"Rial ödeme (Zarinpal)",pm_zarin_soon:"Yakında aktif (Zarinpal onayı bekleniyor). Şimdilik: kripto veya destek.",pm_back:"Geri",pay_email:"E-posta (lisans teslimi)",pay_amount:"Tam tutar (yalnızca bu sipariş)",pay_copy:"Kopyala",pay_copied:"Kopyalandı!",pay_paid:"Ödedim — makbuz gönder",pay_order:"Sipariş kodu:",pay_note:"Tutar bu siparişe özeldir. Ödemeden sonra kod ve TXID'yi desteğe gönder.",pay_sub:"Kripto ödeme — otomatik aktivasyon",track_title:"Sipariş takibi",track_btn:"Durumu kontrol et",track_pending:"⏳ Ödeme bekleniyor — lisans otomatik verilir.",track_paid:"✅ Ödeme onaylandı — lisansın:",track_notfound:"Bu kodla sipariş bulunamadı."},
ar:{pay_method:"اختر طريقة الدفع",pm_zarin_title:"الدفع بالريال (زرين بال)",pm_zarin_soon:"يُفعّل قريباً (بانتظار موافقة زرين بال). حالياً: كريبتو أو الدعم.",pm_back:"رجوع",pay_email:"البريد الإلكتروني (تسليم الترخيص)",pay_amount:"المبلغ الدقيق (لهذا الطلب فقط)",pay_copy:"نسخ",pay_copied:"تم النسخ!",pay_paid:"دفعت — إرسال الإيصال",pay_order:"كود الطلب:",pay_note:"المبلغ فريد لهذا الطلب. بعد الإيداع أرسل الكود وTXID للدعم.",pay_sub:"دفع كريبتو — تفعيل تلقائي",track_title:"تتبع الطلب",track_btn:"فحص الحالة",track_pending:"⏳ بانتظار الدفع — يُصدر الترخيص تلقائياً.",track_paid:"✅ تم تأكيد الدفع — ترخيصك:",track_notfound:"لم يُعثر على طلب بهذا الكود."},
fil:{pay_method:"Pumili ng paraan ng bayad",pm_zarin_title:"Bayad sa Rial (Zarinpal)",pm_zarin_soon:"Mag-a-activate malapit na (hintay ang Zarinpal approval). Samantala: crypto o support.",pm_back:"Bumalik",pay_email:"Email (delivery ng license)",pay_amount:"Eksaktong halaga (order na ito lang)",pay_copy:"Kopyahin",pay_copied:"Nakopya!",pay_paid:"Bayad na — ipadala ang resibo",pay_order:"Order code:",pay_note:"Natatangi ang halaga para sa order na ito. Pagkatapos ng bayad, ipadala ang code at TXID sa support.",pay_sub:"Crypto bayad — awtomatikong activation",track_title:"Subaybayan ang order",track_btn:"Suriin ang status",track_pending:"⏳ Naghihintay ng bayad — awtomatikong lalabas ang license.",track_paid:"✅ Nakumpirma ang bayad — license mo:",track_notfound:"Walang order na nahanap sa code na ito."}};
PL.tl=PL.fil;
function fillPay(){var lang=window.NOVA_lang||document.documentElement.lang||"fa";var d=PL[lang]||PL.en;document.querySelectorAll("#payModal [data-i18n],#trackModal [data-i18n]").forEach(function(el){var k=el.getAttribute("data-i18n");if(d[k])el.textContent=d[k];});}
document.addEventListener("change",fillPay);
fillPay();
console.log("✅ NOVA checkout ready");
})();
