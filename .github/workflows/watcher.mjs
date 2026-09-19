const SUP=process.env.SUPABASE_URL, KEY=process.env.SUPABASE_SERVICE_KEY;
const TG_TOKEN=process.env.TELEGRAM_TOKEN, TG_CHAT=process.env.TELEGRAM_CHAT_ID;
const H={Authorization:`Bearer ${KEY}`,apikey:KEY,'Content-Type':'application/json'};
const DAYS=[30,90,365];
const PLAN_FA=['ماهانه','سه‌ماهه','سالانه'];
const near=(a,b)=>Math.abs(a-b)<1e-6;
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
async function sb(p,o){const r=await fetch(SUP+'/rest/v1/'+p,Object.assign({headers:H},o));if(!r.ok)throw new Error(p+' '+r.status+' '+await r.text());return r.json();}
async function tg(text){if(!TG_TOKEN||!TG_CHAT){console.log('TG not configured');return;}const r=await fetch('https://api.telegram.org/bot'+TG_TOKEN+'/sendMessage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:TG_CHAT,text,parse_mode:'HTML'})});if(!r.ok)console.error('tg fail',await r.text());}
async function noted(tx){const r=await sb('notify_log?tx_hash=eq.'+encodeURIComponent(tx)+'&select=tx_hash');return r.length>0;}
async function note(tx,kind){await sb('notify_log',{method:'POST',body:JSON.stringify({tx_hash:tx,kind})});}
async function main(){
  const since=Date.now()-24*3600e3;
  const tron=await fetch('https://apilist.tronscanapi.com/api/trc20_tokens?limit=40&relatedAddress='+process.env.WALLET_TRON).then(r=>r.json()).catch(()=>null);
  const ton=await fetch('https://toncenter.com/api/v2/getTransactions?address='+process.env.WALLET_TON+'&limit=40').then(r=>r.json()).catch(()=>null);
  const events=[];
  if(tron&&tron.data)for(const t of tron.data){if(t.to===process.env.WALLET_TRON&&t.token_info&&t.token_info.symbol==='USDT'&&t.block_timestamp>=since)events.push({tx:t.transaction_id,coin:'usdt',amount:Number(t.value)/1e6,ts:t.block_timestamp,link:'https://tronscan.org/#/transaction/'+t.transaction_id});}
  if(ton&&ton.result)for(const t of ton.result){const m=t.in_msg;if(m&&Number(m.value)>0&&t.utime*1000>=since)events.push({tx:t.hash,coin:'ton',amount:Number(m.value)/1e9,ts:t.utime*1000,link:'https://tonscan.org/tx/'+t.hash});}
  const orders=await sb('orders?status=eq.pending&select=*');
  for(const ev of events){
    if(await noted(ev.tx))continue;
    const match=orders.find(o=>o.coin===ev.coin&&near(o.amount_expected,ev.amount));
    if(match){
      await sb('orders?id=eq.'+match.id,{method:'PATCH',body:JSON.stringify({status:'paid',tx_hash:ev.tx,paid_at:new Date().toISOString()})});
      const d=DAYS[match.plan]||30;
      const key='NOVA-'+[...Array(3)].map(()=>Math.random().toString(36).slice(2,6).toUpperCase()).join('-');
      await sb('licenses',{method:'POST',body:JSON.stringify({key,order_id:match.id,plan:match.plan,days:d,expires_at:new Date(Date.now()+d*86400e3).toISOString()})});
      await note(ev.tx,'paid');
      await tg('💰 <b>واریز تأییدشد — سفارش '+esc(match.code)+'</b>\n━━━━━━━━━━\n💳 روش: '+(ev.coin==='usdt'?'USDT TRC-20':'TON')+'\n💵 مبلغ: '+ev.amount+' '+(ev.coin==='usdt'?'USDT':'TON')+'\n📦 پلن: '+(PLAN_FA[match.plan]||match.plan)+'\n📧 ایمیل: '+(esc(match.email)||'—')+'\n🔑 لایسنس: <code>'+key+'</code>\n🔗 <a href="'+ev.link+'">تراکنش</a>\n⏰ '+new Date(ev.ts).toLocaleString('fa-IR'));
    } else {
      await note(ev.tx,'unmatched');
      await tg('⚠️ <b>واریز بدون سفارش</b>\n💳 روش: '+(ev.coin==='usdt'?'USDT TRC-20':'TON')+'\n💵 مبلغ: '+ev.amount+'\n🔗 <a href="'+ev.link+'">تراکنش</a>\n⏰ '+new Date(ev.ts).toLocaleString('fa-IR'));
    }
  }
  console.log('watcher done, events:',events.length);
}
main().catch(e=>{console.error(e);process.exit(1);});
