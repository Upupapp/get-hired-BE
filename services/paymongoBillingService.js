import dbQuery from '../db/dbQuery';
import env from '../env';
import axios from 'axios';
const {billing}=require('./paymongo-billing/service.cjs');
const {provider}=require('./paymongo-billing/provider.cjs');
let instance;
function service(){if(!instance){const config={enabled:process.env.PAYMONGO_BILLING_ENABLED==='true',mode:process.env.PAYMONGO_MODE,nodeEnv:process.env.NODE_ENV,dbHost:env.host,liveAuthorized:process.env.PAYMONGO_LIVE_AUTHORIZED==='true',secretKey:env.paymongo_sk,webhookSecret:env.paymongo_webhook_secret};instance=billing(dbQuery,env.schema,config,provider(axios,config));}return instance;}
const api={};['resolve','checkout','preview','webhook','status','effective','history','reconcile','observability'].forEach(name=>{api[name]=function(){return service()[name].apply(service(),arguments);};});
export default api;
