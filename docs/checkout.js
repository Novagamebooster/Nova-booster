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

  console.log("✅ NOVA checkout ready");
})();
