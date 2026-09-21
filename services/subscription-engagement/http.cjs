const { browserEvents } = require('./events.cjs');
function routes(express,service,verifyAuth,enabled) {
 const router=express.Router();
 router.use('/employer',verifyAuth,async(req,res,next)=> {
  if(!enabled()) return res.status(503).json({success:false,error:{code:'ENGAGEMENT_DISABLED'}});
  try {req.engagement=await service.resolve(req.user.uid);next();} catch(e) {res.status(e.httpStatus || 503).json({success:false,error:{code:e.code || 'ENGAGEMENT_UNAVAILABLE'}});}
 });
 function endpoint(handler) {return async(req,res)=> {try {res.json({success:true,...await handler(req)});}catch(e) {res.status(e.httpStatus || 503).json({success:false,error:{code:e.code || 'ENGAGEMENT_UNAVAILABLE'}});}};}
 function filters(req) {
  const f={page:Number(req.query.page || 1),limit:Number(req.query.limit || 20)};
  if(!Number.isInteger(f.page)||f.page<1||f.page>100000||!Number.isInteger(f.limit)||f.limit<1||f.limit>100) throw Object.assign(new Error('Invalid pagination'),{httpStatus:400,code:'INVALID_FILTER'});
  const enums={category:['HIRING','APPLICATIONS','MESSAGES','SUBSCRIPTION','BILLING','ACCOUNT'],priority:['INFO','NOTICE','WARNING','HIGH','CRITICAL'],status:['PENDING','DELIVERED','READ','CLICKED','DISMISSED','EXPIRED']};
  for(const k of Object.keys(enums)) if(req.query[k]) {if(!enums[k].includes(req.query[k])) throw Object.assign(new Error('Invalid filter'),{httpStatus:400,code:'INVALID_FILTER'});f[k]=req.query[k];}
  return f;
 }
 router.get('/employer/notifications',endpoint(req=>service.list(req.engagement.companyId,req.engagement.recipient,filters(req))));
 router.get('/employer/notifications/unread-count',endpoint(async req=>({unreadCount:(await service.list(req.engagement.companyId,req.engagement.recipient,{page:1,limit:1})).unreadCount})));
 for(const action of ['read','dismiss','click','seen']) {
  router[action==='read'||action==='dismiss'?'patch':'post']('/employer/notifications/:id/'+action,endpoint(async req=> {
   if(!/^[a-zA-Z0-9_-]{1,100}$/.test(req.params.id)) throw Object.assign(new Error('Invalid notification ID'),{httpStatus:400,code:'INVALID_ID'});
   const updated=await service.interact(req.engagement.companyId,req.engagement.recipient,req.params.id,action);
   if(!updated) throw Object.assign(new Error('Notification not found'),{httpStatus:404,code:'NOT_FOUND'});
   return {updated};
  }));
 }
 router.get('/employer/engagement/context',endpoint(req=>service.readContext(req.engagement.companyId,req.engagement.recipient)));
 router.get('/employer/subscription/storage',endpoint(req=>service.storageList(req.engagement.companyId,req.engagement.recipient)));
 router.delete('/employer/subscription/storage/:id',endpoint(req=>service.storageDelete(req.engagement.companyId,req.engagement.recipient,req.params.id)));
 router.get('/employer/subscription/recommendation',endpoint(async req=>({recommendation:await service.recommendation(req.engagement.companyId,req.engagement.recipient)})));
 router.get('/employer/communication-preferences',endpoint(async req=>({preferences:await service.preferences(req.engagement.companyId,req.engagement.recipient)})));
 router.patch('/employer/communication-preferences',endpoint(async req=> {
  if(!req.body || !req.body.preferences || typeof req.body.preferences!=='object' || Array.isArray(req.body.preferences)) throw Object.assign(new Error('Invalid preference'),{httpStatus:400,code:'INVALID_PREFERENCE'});
  return {preferences:await service.preferences(req.engagement.companyId,req.engagement.recipient,req.body.preferences)};
 }));
 // Browser events describe interest only. Billing outcomes, usage and feature gates are server-only.
 router.post('/employer/engagement/events',endpoint(async req=> {
  if(!req.body || !browserEvents.includes(req.body.type) || typeof req.body.key!=='string') throw Object.assign(new Error('Invalid event'),{httpStatus:400,code:'INVALID_EVENT'});
  const hour=new Date().toISOString().slice(0,13);
  return service.enqueue(req.engagement.companyId,{type:req.body.type,key:'browser:'+req.user.uid+':'+req.body.type+':'+hour,actorUid:req.user.uid});
 }));
 return router;
}
module.exports={routes};
