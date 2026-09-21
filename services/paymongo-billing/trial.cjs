'use strict';
const {fail}=require('./security.cjs');
// Match the published seven-day trial; it is never a paid purchase.
async function provision(db,schema,companyId,subscriptionId){
 if(subscriptionId!==1)throw fail('PAYMENT_REQUIRED',402);
 if(!/^[a-z_][a-z0-9_]*$/i.test(schema))throw fail('PAYMONGO_CONFIGURATION_INVALID',503);
 return db.transaction(async q=>{
  await q.query('SELECT pg_advisory_xact_lock(hashtext($1))',['billing:'+companyId]);
  const old=await q.query(`SELECT * FROM ${schema}.companies_subscription WHERE company_id=$1 ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,[companyId]);
  if(old.rows.length)return old.rows[0];
  const start=new Date(),end=new Date(+start+7*86400000);
  return (await q.query(`INSERT INTO ${schema}.companies_subscription(company_id,subscription_id,created_at,period_start,period_end,is_paid,payment_date,sub_status,plan_slug,billing_cycle,engagement_plan_version) VALUES($1,1,$2,$2,$3,FALSE,NULL,'trialing','free_trial','monthly','legacy_v4') RETURNING *`,[companyId,start,end])).rows[0];
 });
}
module.exports={provision};
