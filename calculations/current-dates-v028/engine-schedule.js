function schedule(start,end,months){
 date(start);date(end);
 if(start<'2000-01-01'||end>'9999-12-31'||![1,3,12].includes(months))throw Error('Unsupported bounded schedule');
 const [year,month,day]=start.split('-').map(Number),out=[],lastIndex=(9999-year)*12+12-month;
 for(let n=0;n*months<=lastIndex;n++){
  const index=month-1+n*months,y=year+Math.floor(index/12),m=index%12,last=new Date(Date.UTC(y,m+1,0)).getUTCDate(),d=[y,String(m+1).padStart(2,'0'),String(Math.min(day,last)).padStart(2,'0')].join('-');
  if(d>end)return out;if(out.length===2400)throw Error('Policy reporting schedule exceeds 2400 occurrences');out.push(d);
 }
 return out;
}
