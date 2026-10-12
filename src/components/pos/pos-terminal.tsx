"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { Minus, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { checkoutAction, type CheckoutState } from "@/modules/pos/actions";
import { formatQuantity, normalizeQuantity, quantityToThousandths } from "@/lib/quantity";

type Product={id:string;name:string;sku:string;barcode:string|null;category:string;price:string;quantity:number|null;fractional?:boolean};
export type PaymentBank={id:string;bankName:string;branchName:string;accountName:string;accountNumber:string};
type CreditCustomer={id:string;name:string;phone:string;balance:string};
type PaymentMode="CASH"|"BANK_TRANSFER"|"CARD"|"MOBILE_MONEY"|"OTHER"|"CASH_TRANSFER"|"CREDIT";
const money=(v:string)=>{const m=v.trim().replaceAll(",","").match(/^(\d+)(?:\.(\d{0,2}))?$/);return m?BigInt(m[1])*100n+BigInt((m[2]||"").padEnd(2,"0")):0n};
const show=(v:bigint)=>`${v/100n}.${(v%100n).toString().padStart(2,"0")}`;
const lineTotal=(p:Product,q:number)=>(BigInt(p.price)*quantityToThousandths(q)+500n)/1000n;

export function PosTerminal({products,banks,customers,canManageCredit,branchId,sessionId,currency}:{products:Product[];banks:PaymentBank[];customers:CreditCustomer[];canManageCredit:boolean;branchId:string;sessionId:string;currency:string}) {
  const router=useRouter(); const [query,setQuery]=useState(""); const [category,setCategory]=useState(""); const [cart,setCart]=useState<Record<string,number>>({}); const [quantityInputs,setQuantityInputs]=useState<Record<string,string>>({}); const [key,setKey]=useState(()=>crypto.randomUUID()); const [discount,setDiscount]=useState("0.00"); const [method,setMethod]=useState<PaymentMode>("CASH"); const [bank,setBank]=useState(""); const [reference,setReference]=useState(""); const [customer,setCustomer]=useState(""); const [cash,setCash]=useState("0.00"); const [transfer,setTransfer]=useState("0.00");
  const signature=products.filter(p=>p.quantity!==null).map(p=>`${p.id}:${p.quantity}`).join("|"); const [recent,setRecent]=useState<{signature:string;items:Record<string,number>}|null>(null); const completed=useRef(new Set<string>()); const [state,action,pending]=useActionState(checkoutAction,{} as CheckoutState); const done=state.sale?.idempotencyKey===key;
  useEffect(()=>{if(!done||completed.current.has(key))return;completed.current.add(key);setRecent({signature,items:cart});router.refresh()},[cart,done,key,router,signature]);
  const available=(p:Product)=>p.quantity===null?null:Math.max(0,normalizeQuantity(p.quantity-((recent?.signature===signature?recent.items[p.id]:0)||0)));
  const setQuantity=(id:string,value:number)=>{const p=products.find(x=>x.id===id);if(!p)return;const fractional=p.fractional!==false;const q=Math.min(available(p)??100000,Math.max(fractional?0.001:1,Number.isFinite(value)?(fractional?normalizeQuantity(value):Math.trunc(value)):1));setCart(c=>({...c,[id]:q}));setQuantityInputs(current=>{const next={...current};delete next[id];return next})};
  const commitQuantity=(id:string)=>{const raw=quantityInputs[id];if(raw===undefined)return;setQuantity(id,Number(raw))};
  const add=(id:string)=>{const p=products.find(x=>x.id===id);if(!p||(available(p)??1)<1)return;if(done){setKey(crypto.randomUUID());setCart({[id]:1});return}setQuantity(id,(cart[id]||0)+1)};
  const lines=done?[]:Object.entries(cart).map(([id,quantity])=>({product:products.find(p=>p.id===id)!,quantity})); const subtotal=lines.reduce((sum,line)=>sum+lineTotal(line.product,line.quantity),0n); const discountAmount=money(discount); const due=subtotal-(discountAmount>subtotal?subtotal:discountAmount); const cashAmount=money(cash); const transferAmount=money(transfer); const credit=method==="CREDIT"&&cashAmount+transferAmount<=due?due-cashAmount-transferAmount:0n;
  const payments=method==="CASH_TRANSFER"||method==="CREDIT"?[...(cashAmount>0n?[{method:"CASH",amount:show(cashAmount),reference:"",paymentBankId:null}]:[]),...(transferAmount>0n?[{method:"BANK_TRANSFER",amount:show(transferAmount),reference,paymentBankId:bank}]:[])]:[{method,amount:show(due),reference,paymentBankId:method==="BANK_TRANSFER"?bank:null}]; const needsBank=method==="BANK_TRANSFER"||transferAmount>0n; const paid=payments.reduce((s,p)=>s+money(p.amount),credit); const valid=paid===due&&(!needsBank||bank!=="")&&(method!=="CREDIT"||(credit>0n&&customer!==""));
  const listed=products.filter(p=>(!category||p.category===category)&&`${p.name} ${p.sku} ${p.barcode||""}`.toLowerCase().includes(query.toLowerCase())).slice(0,60); const categories=[...new Set(products.map(p=>p.category))].sort();
  return <div className="pos-layout">
    <section className="product-pane">
      <div className="pos-search"><Search size={18}/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();const p=products.find(x=>x.barcode===query.trim()||x.sku.toLowerCase()===query.trim().toLowerCase());if(p){add(p.id);setQuery("")}}}} placeholder="Search product or scan barcode"/></div>
      <div className="category-strip"><button className={!category?"active":""} onClick={()=>setCategory("")}>All</button>{categories.map(c=><button key={c} className={category===c?"active":""} onClick={()=>setCategory(c)}>{c}</button>)}</div>
      <div className="product-grid">{listed.map(p=><button key={p.id} onClick={()=>add(p.id)} disabled={available(p)===0}><small>{p.sku}</small><strong>{p.name}</strong><span>{currency} {show(BigInt(p.price))}</span><em>{available(p)===null?"Not tracked":`${formatQuantity(available(p)!)} available`}</em></button>)}</div>
    </section>
    <aside className="cart-pane">
      <div className="cart-title"><ShoppingCart size={18}/><h2>Current sale</h2><span>{lines.length}</span></div>
      <div className="cart-lines">
        {lines.map(line=>{const p=line.product;const max=available(p);const fractional=p.fractional!==false;const draft=quantityInputs[p.id];return <article key={p.id}>
          <div><strong>{p.name}</strong><small>{p.sku}</small></div>
          <div className="qty"><button aria-label={`Decrease ${p.name}`} onClick={()=>setQuantity(p.id,line.quantity-1)}><Minus/></button><input aria-label={`Quantity for ${p.name}`} type="number" inputMode="decimal" min={fractional?0.001:1} step={fractional?0.001:1} max={max??100000} value={draft??formatQuantity(line.quantity)} onChange={e=>setQuantityInputs(current=>({...current,[p.id]:e.target.value}))} onBlur={()=>commitQuantity(p.id)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();commitQuantity(p.id)}}}/><button aria-label={`Increase ${p.name}`} onClick={()=>add(p.id)} disabled={max!==null&&line.quantity>=max}><Plus/></button></div>
          <strong>{currency} {show(lineTotal(p,line.quantity))}</strong><button className="icon-button" aria-label={`Remove ${p.name}`} onClick={()=>setCart(c=>{const n={...c};delete n[p.id];return n})}><Trash2/></button>
        </article>})}
        {!lines.length&&<div className="empty-cart">Scan or select a product to begin.</div>}
      </div>
      <form action={action} className="checkout">
        <input type="hidden" name="branchId" value={branchId}/><input type="hidden" name="sessionId" value={sessionId}/><input type="hidden" name="idempotencyKey" value={key}/><input type="hidden" name="items" value={JSON.stringify(lines.map(l=>({productId:l.product.id,quantity:l.quantity})))} /><input type="hidden" name="discountAmount" value={show(discountAmount>subtotal?subtotal:discountAmount)}/><input type="hidden" name="payments" value={JSON.stringify(payments)}/><input type="hidden" name="creditAmount" value={show(credit)}/>
        <div className="sale-calculation"><div><span>Subtotal</span><strong>{currency} {show(subtotal)}</strong></div><label>Discount ({currency})<input value={discount} onChange={e=>setDiscount(e.target.value)} inputMode="decimal" disabled={!lines.length}/></label><div className="total-row"><span>Total</span><strong>{currency} {show(due)}</strong></div></div>
        <label>Payment option<select value={method} onChange={e=>setMethod(e.target.value as PaymentMode)}><option value="CASH">Cash</option><option value="BANK_TRANSFER">Bank transfer</option><option value="CASH_TRANSFER">Cash + bank transfer</option><option value="CARD">Card / POS terminal</option><option value="MOBILE_MONEY">Mobile money</option><option value="OTHER">Other</option>{canManageCredit&&<option value="CREDIT">Credit sale</option>}</select></label>
        {(method==="CASH_TRANSFER"||method==="CREDIT")&&<div className="tender-grid"><label>Cash paid ({currency})<input value={cash} onChange={e=>setCash(e.target.value)} inputMode="decimal"/></label><label>Transfer paid ({currency})<input value={transfer} onChange={e=>setTransfer(e.target.value)} inputMode="decimal"/></label></div>}
        {needsBank&&<label>Bank account depositing to<select value={bank} onChange={e=>setBank(e.target.value)} required><option value="">Choose a bank account…</option>{banks.map(b=><option key={b.id} value={b.id}>{b.bankName} · {b.accountName} (…{b.accountNumber.slice(-4)})</option>)}</select></label>}
        {(method==="BANK_TRANSFER"||method==="CASH_TRANSFER"||method==="CREDIT"||method==="OTHER")&&<label>Payment reference<input value={reference} onChange={e=>setReference(e.target.value)}/></label>}
        {method==="CREDIT"&&<label>Credit customer<select name="creditCustomerId" value={customer} onChange={e=>setCustomer(e.target.value)} required><option value="">Choose a customer…</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}</select></label>}
        {state.error&&<p className="form-error">{state.error}</p>}{done&&state.sale&&<div className="sale-success">Sale {state.sale.saleNumber} completed. <Link href={`/pos/receipt/${state.sale.id}`}>View receipt</Link></div>}<button className="button primary pay-button" disabled={pending||!lines.length||!valid}>{pending?"Processing…":`Pay ${currency} ${show(due)}`}</button>
      </form>
    </aside>
  </div>;
}
