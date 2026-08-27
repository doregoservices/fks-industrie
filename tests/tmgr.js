;(async()=>{
await loadSettings();await seedDemo();
S.user={name:'test',role:'manager'};
S.route='parametres';location.hash='#/parametres';await render();
const h=$('#main').innerHTML;
if(!h.includes('Manager (tout voir)'))throw new Error('option absente');
/* une fiche manager donne bien tout voir */
S.user={name:'Direction GFE',role:'manager'};
if(!roleAllowed('paie')||!roleAllowed('parametres')||!roleAllowed('exploitation'))throw new Error('fiche manager restreinte ?!');
/* une fiche caissier reste restreinte */
S.user={name:'Caisse',role:'caissier'};
if(roleAllowed('paie')||roleAllowed('production'))throw new Error('caissier trop de droits');
console.log('TMGR: OK — option « Manager (tout voir) » présente, fiche manager = tout voir, caissier = restreint');
})().catch(e=>{console.error('ÉCHEC TMGR:',e.message);process.exit(1);});
