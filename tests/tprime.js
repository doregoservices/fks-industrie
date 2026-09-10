;/* TPRIME : prime de rendement AU NET (l'outil calcule le brut) + pré-remplissage kg vendus × 25 F modifiable + grand livre PDF */
;(async()=>{
await loadSettings();await seedDemo();S.user={name:'test',role:'manager'};
const per=monthISO();
/* 1 · gross-up exact : l'employé touche exactement le montant net saisi */
const emp={name:'Awa Test',salary_type:'monthly',base_salary:250000,transport:0,housing:0,tax_shares:2};
const s0=computeSlip(emp,{primes:[]});
const s1=computeSlip(emp,{primes:[{id:'x1',name:'Prime de rendement',amount:1500,net:true,kg:60,taxable:true}]});
const d=s1.net-s0.net;
if(Math.abs(d-1500)>1)throw new Error('net touché '+d+' au lieu de 1500 (gross-up inexact)');
if(s1.brut_ap<=s0.brut_ap)throw new Error('le brut doit augmenter (c est l outil qui le calcule)');
const p1=s1.primes[0];
if(!p1.gross||p1.gross<=1500)throw new Error('brut de la prime incohérent : '+JSON.stringify(p1));
if(p1.netAmt!==1500||p1.amount!==p1.gross)throw new Error('netAmt/amount incorrects : '+JSON.stringify(p1));
/* 2 · deux primes au net simultanées : total net exact */
const s2=computeSlip(emp,{primes:[{id:'x1',name:'R1',amount:1500,net:true,taxable:true},{id:'x2',name:'R2',amount:2500,net:true,taxable:true}]});
if(Math.abs((s2.net-s0.net)-4000)>1)throw new Error('2 primes au net : delta '+(s2.net-s0.net)+' au lieu de 4000');
/* 3 · pré-remplissage kg : commerciale portant le même nom que l employé */
await DB.insert('employees',{id:'empPrime1',name:'Awa Prime Test',position:'Vendeuse',salary_type:'monthly',base_salary:250000,transport:0,housing:0,tax_shares:2,zone:'abidjan',active:true,hire_date:todayISO()});
await DB.insert('sales_agents',{name:'Awa Prime Test',phone:'',token:'tokprime',active:true});
const prod=(await DB.list('products'))[0];
await DB.insert('sales',{date:per+'-15',agent_id:null,agent_name:'Awa Prime Test',pay_mode:'cash',total:300000,lines:[{product_id:prod.id,qty:100,price:3000}],source:'admin',status:'validated',credit_status:'paid'});
SETS.payroll.primes=[{id:'pr1',name:'Prime de rendement',mode:'fixed',value:0,taxable:true,net:true,auto:'kg',kgRate:25}];
await setSetting('payroll',SETS.payroll);
location.hash='#/paie';S.route='paie';S.tab={paie:'run'};S.payPeriod=per;await render();
const h=$('#main').innerHTML;
const mKg=h.match(new RegExp('value="([0-9.]+)" id="x_kg_empPrime1_0"'));
const mAmt=h.match(new RegExp('value="([0-9]+)" id="x_pr_empPrime1_0"'));
if(!mKg)throw new Error('champ kg absent ou non pré-rempli dans la table de génération');
const w=(Number(prod.weight_g)||0)/1000;
if(Math.abs(Number(mKg[1])-100*w)>0.01)throw new Error('kg pré-rempli '+mKg[1]+' au lieu de '+(100*w));
if(!mAmt||Math.abs(Number(mAmt[1])-100*w*25)>0.5)throw new Error('montant pré-rempli '+(mAmt&&mAmt[1])+' au lieu de '+(100*w*25));
/* 4 · kg ET montant modifiables : 60 kg → 1500 F, génération, bulletin net exact */
$('#x_kg_empPrime1_0').value='60';$('#x_pr_empPrime1_0').value='1500';
await App.runGen(per);
const run=(await DB.list('pay_runs')).filter(r=>r.period===per)[0];
if(!run)throw new Error('paie non générée');
const slip=(await DB.list('pay_slips',{eq:{run_id:run.id}})).filter(x=>x.employee_id==='empPrime1')[0];
if(!slip)throw new Error('bulletin de l employée test introuvable');
const pp=(slip.primes||[])[0];
if(!pp||Number(pp.kg)!==60||Number(pp.netAmt)!==1500)throw new Error('prime enregistrée incorrecte : '+JSON.stringify(pp));
const eDb=(await DB.list('employees',{eq:{id:'empPrime1'}}))[0];
const s0b=computeSlip(eDb,{primes:[],advances:slip.advances||0});
if(Math.abs((slip.net-s0b.net)-1500)>2)throw new Error('bulletin : delta net '+(slip.net-s0b.net)+' au lieu de 1500');
/* 5 · bulletin : mention « au net » */
const bh=await slipHtml(slip);
if(bh.indexOf('au net')<0)throw new Error('mention au net absente du bulletin');
/* 6 · grand livre : aperçu Imprimer / PDF */
$('#main').innerHTML='<input id="lvT"><input id="lvEnd">';
$('#lvT').value='m';$('#lvEnd').value=per;
await App.livrePrint();
const lh=$('#main').innerHTML;
if(lh.indexOf('Grand livre de paie')<0||lh.indexOf('Imprimer')<0)throw new Error('aperçu PDF du grand livre non rendu');
if(lh.indexOf('Awa Prime Test')<0)throw new Error('employée absente du grand livre PDF');
console.log('✓ Prime AU NET : l employé touche exactement le montant saisi — le brut est calculé par l outil (ITS + CNPS incluses)');
console.log('✓ Pré-remplissage automatique kg vendus × 25 F — kg ET montant modifiables (60 kg → 1500 F vérifié sur le bulletin)');
console.log('✓ Deux primes au net simultanées : total net exact');
console.log('✓ Bulletin : mention « (au net : … F) » sur la ligne de la prime');
console.log('✓ Grand livre de paie : aperçu Imprimer / PDF en plus du téléchargement Excel');
console.log('TPRIME: TOUT PASSE');
})().catch(e=>{console.log('ECHEC TPRIME:',e.message);process.exit(1);});
