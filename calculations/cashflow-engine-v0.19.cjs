/* Shared pure engine: embed this exact file in the standalone prototype. No I/O. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CashflowEngine=api;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const DAY=86400000;
function date(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))throw Error('Invalid calendar date');const x=Date.parse(s+'T00:00:00Z');if(!Number.isFinite(x)||new Date(x).toISOString().slice(0,10)!==s)throw Error('Invalid calendar date');return x/DAY;}
function unavailable(reason,extra={}){return {available:false,reason,...extra};}
function requireValue(n,label){if(typeof n!=='number'||!Number.isFinite(n)||n<0)throw Error('Invalid '+label);return n;}
function collapse(flows){const sums=new Map();for(const f of flows){date(f.date);if(typeof f.amount!=='number'||!Number.isFinite(f.amount))throw Error('Nonfinite cash flow');const sum=(sums.get(f.date)||0)+f.amount;if(!Number.isFinite(sum))throw Error('Nonfinite same-date aggregated cash flow');sums.set(f.date,sum);}return [...sums].sort((a,b)=>a[0].localeCompare(b[0])).map(([date,amount])=>({date,amount})).filter(f=>f.amount!==0);}
// Conventional signs only: after same-day collapse all investments precede all receipts.
// Scaling by a pivot between last negative and first positive makes the equation
// strictly decreasing in log(1+growth), proving uniqueness rather than picking a root.
function rootGrowth(points){
 const nonzero=points.filter(p=>p.amount!==0);if(!nonzero.some(p=>p.amount<0))return unavailable('No invested capital');
 let positive=false,changes=0,lastSign=0;for(const p of nonzero){const sign=Math.sign(p.amount);if(lastSign&&lastSign!==sign)changes++;lastSign=sign;if(sign>0)positive=true;}
 if(!positive)return {available:true,cumulative:-1,logGrowth:-Infinity,totalLoss:true};
 if(changes!==1||nonzero[0].amount>=0||nonzero.at(-1).amount<=0)return unavailable('Ambiguity risk: nonconventional sign pattern; multiple roots cannot be excluded');
 if(nonzero.reduce((s,p)=>s+p.amount,0)===0)return {available:true,cumulative:0,logGrowth:0}; // Exact zero NPV at zero, after uniqueness proof; not a tolerance/fallback zero.
 const lastNegative=nonzero.filter(p=>p.amount<0).at(-1),firstPositive=nonzero.find(p=>p.amount>0),pivot=(lastNegative.t+firstPositive.t)/2;
 function value(y){const terms=nonzero.map(p=>({sign:Math.sign(p.amount),log:Math.log(Math.abs(p.amount))-(p.t-pivot)*y}));const scale=Math.max(...terms.map(p=>p.log));return terms.reduce((s,p)=>s+p.sign*Math.exp(p.log-scale),0);}
 let lo=-32,hi=32;if(!(value(lo)>0&&value(hi)<0))return unavailable('No unique root inside supported growth domain (log growth ±32)');
 for(let i=0;i<220;i++){const mid=(lo+hi)/2;if(value(mid)>0)lo=mid;else hi=mid;}
 const logGrowth=(lo+hi)/2,cumulative=Math.expm1(logGrowth);if(!Number.isFinite(cumulative)||cumulative<=-1)return unavailable('Extreme root outside numeric reporting domain');
 return {available:true,cumulative,logGrowth};
}
function solve(flows,start,end){try{
 const s=date(start),e=date(end),duration=e-s;if(duration<=0)return unavailable('Zero or negative reporting duration');
 for(const f of flows){date(f.date);if(f.date<start||f.date>end)throw Error('Flow outside declared reporting period');}
 const collapsed=collapse(flows),r=rootGrowth(collapsed.map(f=>({t:(date(f.date)-s)/duration,amount:f.amount})));
 if(!r.available)return {...r,flows:collapsed,start,end,duration};
 if(r.totalLoss&&!flows.some(f=>f.date===end&&f.amount===0))return unavailable('Total loss requires explicit complete zero terminal');
 const annualLog=r.logGrowth*365/duration;if(!r.totalLoss&&(annualLog < -27.6||annualLog>13.8))return unavailable('Extreme annualised root outside supported reporting domain',{flows:collapsed,start,end,duration});
 return {...r,annual:r.totalLoss?-1:Math.expm1(annualLog),flows:collapsed,start,end,duration,method:'Dated cash flow · ACT/365'};
 }catch(e){return unavailable(e.message);}}
const negative=new Set(['Buy','Contribution','Premium','Additional premium','Deposit']);
const positive=new Set(['Sell','Withdrawal','Redemption / maturity','Final proceeds']);
const distributions=new Set(['Dividend','Payout','Coupon / payout']);
function movement(t){const amount=requireValue(t.amount,'cash amount'),fx=requireValue(t.fx,'transaction FX');if(fx<=0)throw Error('Invalid transaction FX');const v=amount*fx;if(!Number.isFinite(v))throw Error('Nonfinite converted cash flow');
 if(negative.has(t.kind))return {signed:-v,bucket:t.kind==='Buy'?'purchases':'contributions',value:v};
 if(positive.has(t.kind))return {signed:v,bucket:'withdrawals',value:v};
 if(t.kind==='Interest')return {signed:0,bucket:'retainedIncome',value:v};
 if(distributions.has(t.kind)){if(!['paid-out','reinvested'].includes(t.treatment))throw Error('Missing distribution treatment');return {signed:t.treatment==='paid-out'?v:0,bucket:t.treatment==='paid-out'?'paidIncome':'retainedIncome',value:v};}
 throw Error('Unknown transaction kind: '+t.kind);
}
function snapshot(h,end){date(end);if(h.closed&&!h.closedDate)throw Error('Closed holding missing closure date');if(h.closedDate&&end>=h.closedDate){date(h.closedDate);return {date:end,value:0,boundary:'EOD',source:'closed zero terminal'};}
 const snapshots=(h.valuations||[]).filter(v=>v.date===end&&v.boundary==='EOD');if(!snapshots.length)throw Error('Missing saved end-of-day (EOD) snapshot for '+h.id+' on '+end);
 const v=snapshots.at(-1);requireValue(v.value,'endpoint value');if(!Number.isFinite(v.fx)||v.fx<=0)throw Error('Invalid endpoint FX');return {...v};}
function breakdown(){return {opening:0,openings:[],purchases:0,contributions:0,withdrawals:0,paidIncome:0,retainedIncome:0};}

// Independent reporting is recorded-data driven. A missing limit is unbounded,
// never today's date. Explicit `end` on row/policy APIs requests a historical
// endpoint; it is capped by limit, while omitted end infers recorded endpoint.
const LAST_DATE='9999-12-31';
function bound(options={}){const end=options.limit===undefined?LAST_DATE:options.limit;date(end);return end;}
function moneySnapshot(v,label){requireValue(v.value,label);if(typeof v.fx!=='number'||!Number.isFinite(v.fx)||v.fx<=0)throw Error('Invalid '+label+' FX');}
function assumed(t){return t.source==='auto';}
function scan(holdings,entries,start,options={}){
 date(start);const limit=bound(options),members=[],seen=new Set();let end=start;
 if(limit<start)throw Error('Date limit precedes reporting baseline');
 for(const h of holdings){
  if(!h?.opening)throw Error('Missing holding opening snapshot');
  const opening=h.opening.date;date(opening);date(h.tracking);
  if(opening!==h.tracking)throw Error('Opening/tracking date mismatch');
  if(seen.has(h.id))throw Error('Duplicate holding identifier');seen.add(h.id);
  if(h.closed&&!h.closedDate)throw Error('Closed holding missing closure date');
  if(h.closedDate)date(h.closedDate);
  if(h.unitsDate)date(h.unitsDate);
  for(const v of h.valuations||[])date(v.date);
  const own=entries.filter(t=>t.holding===h.id);for(const t of own)date(t.date);
  if(opening>limit)continue;
  if(opening<start)throw Error('Opening precedes portfolio baseline');
  if(h.opening.boundary!=='BOD')throw Error('Opening must be beginning-of-day (BOD)');
  moneySnapshot(h.opening,'opening SGD value');
  const closed=h.closedDate&&h.closedDate<=limit?h.closedDate:null;
  if(closed&&closed<opening)throw Error('Closure precedes opening');
  end=end>opening?end:opening;
  for(const v of h.valuations||[]){
   if(v.date>limit||v.date<opening)continue;
   if(v.boundary==='BOD')continue;
   if(v.boundary!=='EOD')throw Error('Invalid endpoint boundary');
   moneySnapshot(v,'endpoint value');
   if(closed&&v.date>closed&&v.value>0)throw Error('Positive saved value after closure');
   if(v.date>end)end=v.date;
  }
  if(h.unitsDate&&h.unitsDate>=opening&&h.unitsDate<=limit){
   if(closed&&h.unitsDate>closed)throw Error('Quantity confirmation after closure');
   if(h.unitsDate>end)end=h.unitsDate;
  }
  if(closed&&closed>end)end=closed;
  let finals=0;
  for(const t of own){
   if(t.active===false||t.date<opening||t.date>limit)continue;
   movement(t); // Validate recorded economic inputs even when an old review exists.
   if(closed&&t.date>closed)throw Error('Active transaction after closure');
   if(t.kind==='Final proceeds'||t.final===true){
    if(!closed||t.date!==closed)throw Error('Final proceeds must agree with closure date');
    if(++finals>1)throw Error('Duplicate final proceeds at closure');
   }
   if(t.date>end)end=t.date;
  }
  members.push(h);
 }
 if(!members.length)throw Error('No holdings in reporting period');
 return {end,members,limit};
}
function reportingEnd(holdings,entries,start,options={}){return scan(holdings,entries,start,options).end;}
function terminal(h,end){
 if(h.closedDate&&h.closedDate<=end)return {date:end,sourceDate:h.closedDate,value:0,fx:1,boundary:'EOD',source:'closed zero terminal',estimated:h.closedDate!==end};
 let selected;
 for(const v of h.valuations||[]){
  if(v.boundary==='EOD'&&v.date>=h.opening.date&&v.date<=end&&(!selected||v.date>=selected.date))selected=v;
 }
 const source=selected||h.opening;
 return {...source,date:end,sourceDate:source.date,estimated:!selected||source.date!==end};
}
function select(h,entries,end,options={}){
 if(!h?.opening)throw Error('Missing holding opening snapshot');
 let opts=options;
 if(end!==undefined){date(end);opts={...options,limit:end<bound(options)?end:bound(options)};}
 const context=scan([h],entries,h.opening.date,opts);
 const reporting=end===undefined?context.end:context.limit;
 return {end:reporting,endpoint:terminal(h,reporting)};
}
function finiteTotals(b){if(['opening','purchases','contributions','withdrawals','paidIncome','retainedIncome'].some(k=>!Number.isFinite(b[k])))throw Error('Nonfinite activity aggregate');}
function financialGain(flows){collapse(flows);const gain=flows.reduce((s,f)=>s+f.amount,0);if(!Number.isFinite(gain))throw Error('Nonfinite aggregated gain');return gain;}
function holding(h,entries,end,options={}){
 const b=breakdown();
 try{
  const selected=select(h,entries,end,options);end=selected.end;
  const start=h.opening.date,endpoint=selected.endpoint,flows=[{date:start,amount:-h.opening.value}];
  b.opening=h.opening.value;b.openings.push({id:h.id,date:start,value:h.opening.value});let estimated=endpoint.estimated;
  for(const t of entries){
   if(t.holding!==h.id||t.active===false||t.date<start||t.date>end)continue;
   const m=movement(t);b[m.bucket]+=m.value;flows.push({date:t.date,amount:m.signed});estimated=estimated||assumed(t);
  }
  finiteTotals(b);b.activityComplete=true;flows.push({date:end,amount:endpoint.value});
  const gain=financialGain(flows);let r=solve(flows,start,end);
  if(r.totalLoss&&endpoint.boundary==='BOD')r=unavailable('Total loss requires explicit complete zero terminal, not opening-only estimate');
  return {...r,start,end,flows,breakdown:b,endpointValue:endpoint.value,gain,endpoint,estimated,method:'Dated cash flow · ACT/365'};
 }catch(e){return unavailable(e.message,{start:h?.opening?.date,end,breakdown:b});}
}
function portfolio(holdings,entries,start,legacyReviews,options={}){
 try{
  const {end,members}=scan(holdings,entries,start,options),b=breakdown(),flows=[],endpoints=[];let endpointValue=0,gain=0,estimated=false;
  for(const h of members){
   const r=holding(h,entries,end,options);if(r.gain===undefined)throw Error(r.reason);
   flows.push(...r.flows);endpointValue+=r.endpointValue;gain+=r.gain;estimated=estimated||r.estimated;
   endpoints.push({id:h.id,...r.endpoint});
   for(const key of ['opening','purchases','contributions','withdrawals','paidIncome','retainedIncome'])b[key]+=r.breakdown[key];b.openings.push(...r.breakdown.openings);
  }
  finiteTotals(b);financialGain(flows);
  if(!Number.isFinite(endpointValue)||!Number.isFinite(gain))throw Error('Nonfinite portfolio aggregate');
  let r=solve(flows,start,end);
  if(r.totalLoss&&endpoints.some(e=>e.boundary==='BOD'))r=unavailable('Total loss requires explicit complete zero terminal, not opening-only estimate');
  return {...r,start,end,breakdown:{...b,activityComplete:true},flows,endpointValue,gain,members:members.map(h=>h.id),endpoints,estimated};
 }catch(e){return unavailable(e.message);}
}
function schedule(start,end,months){date(start);date(end);const a=new Date(start+'T00:00:00Z'),out=[];for(let n=0;n<2400;n++){const first=new Date(Date.UTC(a.getUTCFullYear(),a.getUTCMonth()+n*months,1)),last=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate(),d=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth(),Math.min(a.getUTCDate(),last))).toISOString().slice(0,10);if(d>end)break;out.push(d);}return out;}

function policy(h,entries,end,options={}){
 const method='Dated cash flow · policy inception';let fallbackReason='Irregular/partial schedule: complete equal-period history at compatible boundary not proven';
 try{
  if(!h?.policy)throw Error('No policy schedule');
  const selected=select(h,entries,end,options);end=selected.end;
  const p=h.policy,start=p.start,endpoint=selected.endpoint;date(start);
  if(start>h.opening.date)throw Error('Policy inception after tracking opening');
  if(p.end)date(p.end);
  const own=entries.filter(t=>t.holding===h.id);for(const t of own)date(t.date);
  const all=own.filter(t=>t.date>=start&&t.date<=end),active=all.filter(t=>t.active!==false),flows=[];
  let contributions=0,estimated=endpoint.estimated;
  for(const t of active){const m=movement(t);flows.push({date:t.date,amount:m.signed});if(negative.has(t.kind))contributions+=m.value;estimated=estimated||assumed(t);}
  if(!Number.isFinite(contributions))throw Error('Nonfinite policy contribution aggregate');
  flows.push({date:end,amount:endpoint.value});const gain=financialGain(flows);
  const common={start,end,flows,gain,endpointValue:endpoint.value,endpoint,estimated};
  const months={Monthly:1,Quarterly:3,Annually:12}[p.frequency],dues=months?schedule(start,end,months):[],boundary=dues.at(-1)===end,n=dues.length-1;
  const measured=endpoint.sourceDate===end&&endpoint.boundary==='EOD'&&endpoint.source!=='closed zero terminal';
  if(!measured)fallbackReason='Carried/opening-only terminal: actual endpoint measurement required for RATE';
  const complete=measured&&boundary&&n>0&&!p.end&&all.length===dues.length&&all.every(t=>t.active!==false&&t.kind==='Premium'&&t.amount===p.premium&&t.fx===1&&(!t.due||t.date===t.due))&&dues.every(d=>all.filter(t=>t.date===d).length===1);
  if(complete){
   const fv=endpoint.value-p.premium;
   if(fv>=0){
    const points=dues.slice(0,-1).map((d,i)=>({t:i/n,amount:-p.premium}));points.push({t:1,amount:fv});const r=rootGrowth(points);
    if(r.available){
     const periodic=r.totalLoss?-1:Math.expm1(r.logGrowth/n),annual=r.totalLoss?-1:Math.expm1(Math.log1p(periodic)*12/months);
     if(Number.isFinite(annual)&&annual<1e6&&annual>-.999999999999)return {...r,...common,annual,periodic,periods:n,method:'RATE · beginning-period',methodReason:'Complete equal premiums from first due at policy start; endpoint premium subtracted once from terminal FV'};
    }
   }
  }
  let r=solve(flows,start,end);
  if(r.totalLoss&&endpoint.boundary==='BOD')r=unavailable('Total loss requires explicit complete zero terminal, not opening-only estimate');
  return {...r,...common,method,methodReason:fallbackReason};
 }catch(e){return unavailable(e.message,{method,methodReason:fallbackReason});}
}
return Object.freeze({date,collapse,solve,movement,holding,portfolio,policy,snapshot,schedule,reportingEnd});
});
