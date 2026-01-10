// ============================================
// SEARCHSSI.JS - Module Recherche SSI Avancée
// GESTION PRO - EasyLog Pro
// ============================================
// Dépend de: config.js (APP, YEAR_COLS)
//            utils.js (formatDateDDMMYYYY)
// ============================================

// ============================================
// MODULE SEARCH SSI - CODE EXACT DU FICHIER ssi_search_fixed__3_.html
// ============================================

// Variables globales EXACTES ligne 64-67
let ssiAllData=[],ssiFilteredData=[],ssiTechMapping={},ssiSttMapping={},ssiFullDataRows=[],ssiCurrentSort={column:null,direction:null};
let ssiActiveFilters={bpbt:false,bqbv:false};
let ssiSelectedTechs=new Set();
let ssiTechFilterOpen=false;

// COPIE EXACTE ligne 69-79
function ssiToggleTechFilter(e) {
    e.stopPropagation();
    ssiTechFilterOpen = !ssiTechFilterOpen;
    const dropdown = document.getElementById('ssiTechFilterDropdown');
    if (ssiTechFilterOpen) {
        dropdown.style.display = 'block';
        ssiUpdateTechCheckboxList();
    } else {
        dropdown.style.display = 'none';
    }
}

// COPIE EXACTE ligne 81-106
function ssiUpdateTechCheckboxList() {
    const secteur = document.getElementById('ssiSearchSecteur').value.trim().toUpperCase();
    
    let techsToShow = new Set();
    ssiAllData.forEach(d => {
        if (!secteur || d.secteur === secteur) {
            techsToShow.add(d.tech);
        }
    });
    
    const techArray = [...techsToShow].sort();
    const container = document.getElementById('ssiTechCheckboxList');
    if (!container) return;
    
    container.innerHTML = techArray.map(tech => `
        <label style="display:block;padding:8px;cursor:pointer;border-radius:5px;transition:0.2s" 
               onmouseover="this.style.background='#f0f0f0'" 
               onmouseout="this.style.background='transparent'">
            <input type="checkbox" value="${tech}" 
                   ${ssiSelectedTechs.has(tech) ? 'checked' : ''} 
                   onchange="ssiOnTechCheckboxChange()"
                   style="margin-right:8px;cursor:pointer;width:18px;height:18px">
            <span style="font-weight:600;color:#2c3e50">${tech}</span>
        </label>
    `).join('');
}

// COPIE EXACTE ligne 108-118
function ssiOnTechCheckboxChange() {
    const checkboxes = document.querySelectorAll('#ssiTechCheckboxList input[type="checkbox"]');
    ssiSelectedTechs.clear();
    checkboxes.forEach(cb => {
        if (cb.checked) {
            ssiSelectedTechs.add(cb.value);
        }
    });
    ssiFilterData();
    ssiUpdateTechFilterButtonLabel();
}

// COPIE EXACTE ligne 120-130
function ssiSelectAllTech() {
    const checkboxes = document.querySelectorAll('#ssiTechCheckboxList input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = true);
    ssiOnTechCheckboxChange();
}

function ssiDeselectAllTech() {
    const checkboxes = document.querySelectorAll('#ssiTechCheckboxList input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
    ssiOnTechCheckboxChange();
}

// COPIE EXACTE ligne 132-141
function ssiUpdateTechFilterButtonLabel() {
    const btn = document.getElementById('ssiTechFilterBtn');
    if (!btn) return;
    if (ssiSelectedTechs.size > 0) {
        btn.textContent = `▼ (${ssiSelectedTechs.size})`;
        btn.style.background = '#48bb78';
    } else {
        btn.textContent = '▼';
        btn.style.background = '#667eea';
    }
}

// COPIE EXACTE ligne 143-166
function ssiOnSecteurChange() {
    const secteur = document.getElementById('ssiSearchSecteur').value.trim().toUpperCase();
    
    const validTechs = new Set();
    ssiAllData.forEach(d => {
        if (!secteur || d.secteur === secteur) {
            validTechs.add(d.tech);
        }
    });
    
    ssiSelectedTechs = new Set([...ssiSelectedTechs].filter(t => validTechs.has(t)));
    
    if (ssiTechFilterOpen) {
        ssiUpdateTechCheckboxList();
    }
    
    ssiUpdateTechFilterButtonLabel();
    ssiFilterData();
}

// COPIE EXACTE ligne 187
function ssiCalculHeures(v,h){v=parseFloat(v)||0;h=parseFloat(h)||0;return v===1?h:v===2?h*1.5:h*v;}

// COPIE EXACTE ligne 189-198
function ssiGetSecteur(tech){
    const t=String(tech).trim().toUpperCase();
    if(t.length>=2){
        const last2=t.slice(-2);
        if(last2==='S1')return 'S1';
        if(last2==='S2')return 'S2';
        if(last2==='S3')return 'S3';
    }
    return 'AUTRES';
}

// COPIE EXACTE ligne 200-203
function ssiIsEmpty(val){
    const s=String(val||'').trim().toUpperCase();
    return s===''||s==='UNDEFINED'||s==='NAN'||s==='-';
}

// COPIE EXACTE ligne 205-215
function ssiFormatDateFromExcel(val){
    if(!val)return '';
    const str=String(val).trim();
    if(str===''||str.toUpperCase()==='UNDEFINED'||str.toUpperCase()==='NAN')return '';
    const num=parseFloat(str);
    if(!isNaN(num)&&num>25569&&num<60000){
        const d=new Date((num-25569)*86400*1000);
        const day=String(d.getDate()).padStart(2,'0');
        const month=String(d.getMonth()+1).padStart(2,'0');
        const year=d.getFullYear();
        return day+'/'+month+'/'+year;
    }
    const d=new Date(str);
    if(!isNaN(d.getTime())){
        const day=String(d.getDate()).padStart(2,'0');
        const month=String(d.getMonth()+1).padStart(2,'0');
        const year=d.getFullYear();
        return day+'/'+month+'/'+year;
    }
    return str;
}

// REMPLACE handleFile - lit depuis APP.data au lieu du fichier Excel
// Logique EXACTE lignes 274-319 mais source différente
function ssiInitFromAppData(){
    if (!APP.data.ssi || APP.data.ssi.length === 0) {
        console.log('⚠️ Pas de données SSI');
        return;
    }

    // Copier techMapping depuis APP.tables.tech
    ssiTechMapping={};
    if (APP.tables && APP.tables.tech) {
        APP.tables.tech.forEach((info, code) => {
            const k=String(code).trim().toUpperCase();
            const v=String(info.value||'').trim().toUpperCase();
            if(k)ssiTechMapping[k]=v;
        });
    }

    // Copier sttMapping depuis APP.tables.stt
    ssiSttMapping={};
    if (APP.tables && APP.tables.stt) {
        APP.tables.stt.forEach((info, code) => {
            const k=String(code).trim().toUpperCase();
            const v=String(info.value||'').trim().toUpperCase();
            if(k)ssiSttMapping[k]=v;
        });
    }

    // EXACTEMENT comme lignes 274-319
    const hd = APP.data.ssiHeaders || [];
    ssiAllData=[];
    ssiFullDataRows=[];
    
    for(let i=0;i<APP.data.ssi.length;i++){
        const json = APP.data.ssi[i]._raw || [];
        if(json.length>0){
            const tc=String(json[4]||'').trim().toUpperCase(),
                  tv=ssiTechMapping[tc]||tc,
                  nv=parseFloat(json[18])||0,
                  nh=parseFloat(json[59])||0,
                  ca=String(json[78]||'').trim().toUpperCase(),
                  eb=ca!==''&&ca!=='UNDEFINED'&&ca!=='NAN',
                  tb=eb?(ssiTechMapping[ca]||ca):'';
            const idx=ssiAllData.length;
            ssiAllData.push({
                idx,
                tech:tv,
                nom:String(json[5]||'').trim().toUpperCase(),
                ville:String(json[7]||'').trim().toUpperCase(),
                code:String(json[0]||'').trim().toUpperCase(),
                site:String(json[16]||'').trim().toUpperCase(),
                dept:String(json[9]||'').trim().toUpperCase(),
                nbVisite:nv,
                nbHeure:nh,
                heureCalc:ssiCalculHeures(nv,nh),
                estBinome:eb,
                techBinome:tb,
                techBinomeAffich:tb,
                secteur:ssiGetSecteur(tv),
                bk:ssiFormatDateFromExcel(json[62]),
                bt:ssiFormatDateFromExcel(json[71]),
                bp:ssiFormatDateFromExcel(json[67]),
                bv:ssiFormatDateFromExcel(json[73]),
                bq:ssiFormatDateFromExcel(json[68])
            });
            ssiFullDataRows.push({hd,row:json,tv});
        }
    }
    
    console.log('🔍 SSI Données chargées:', ssiAllData.length, 'lignes');
    ssiCurrentSort={column:null,direction:null};
    ssiFilteredData=[...ssiAllData];
    ssiDisplayData(ssiFilteredData);
    ssiUpdateStats();
    ssiUpdateSortIcons();
    ssiUpdateTechCheckboxList();
    ssiUpdateTechFilterButtonLabel();
}

// COPIE EXACTE ligne 351-360
function ssiToggleFilter(type){
    ssiActiveFilters[type]=!ssiActiveFilters[type];
    const btn=document.getElementById(type==='bpbt'?'ssiFilterV1':'ssiFilterV2');
    if(btn){
        if(ssiActiveFilters[type]){
            btn.classList.add('active');
            btn.style.background='var(--primary)';
            btn.style.color='white';
        }else{
            btn.classList.remove('active');
            btn.style.background='var(--bg-elevated)';
            btn.style.color='var(--text-secondary)';
        }
    }
    ssiFilterData();
}

// COPIE EXACTE ligne 362-394
function ssiSortTable(col){
    if(ssiCurrentSort.column===col){
        if(ssiCurrentSort.direction==='asc'){
            ssiCurrentSort.direction='desc';
        }else if(ssiCurrentSort.direction==='desc'){
            ssiCurrentSort.column=null;
            ssiCurrentSort.direction=null;
            ssiFilterData();
            return;
        }
    }else{
        ssiCurrentSort.column=col;
        ssiCurrentSort.direction='asc';
    }
    
    ssiFilteredData.sort((a,b)=>{
        let valA=a[col],valB=b[col];
        if(col==='nbVisite'||col==='nbHeure'){
            valA=parseFloat(valA)||0;
            valB=parseFloat(valB)||0;
        }else{
            valA=String(valA).toUpperCase();
            valB=String(valB).toUpperCase();
        }
        if(valA<valB)return ssiCurrentSort.direction==='asc'?-1:1;
        if(valA>valB)return ssiCurrentSort.direction==='asc'?1:-1;
        return 0;
    });
    
    ssiDisplayData(ssiFilteredData);
    ssiUpdateStats();
    ssiUpdateSortIcons();
}

// COPIE EXACTE ligne 396-407
function ssiUpdateSortIcons(){
    ['tech','nom','ville','code','site','dept','nbVisite','nbHeure','techBinomeAffich','bk','bt','bp','bv','bq'].forEach(col=>{
        const el=document.getElementById('ssiSort'+col.charAt(0).toUpperCase()+col.slice(1));
        if(el){
            if(ssiCurrentSort.column===col){
                el.textContent=ssiCurrentSort.direction==='asc'?'▲':'▼';
            }else{
                el.textContent='';
            }
        }
    });
}

// COPIE EXACTE ligne 409-449
function ssiFilterData(){
    const c=document.getElementById('ssiSearchCode')?.value.trim().toUpperCase()||'',
          n=document.getElementById('ssiSearchNom')?.value.trim().toUpperCase()||'',
          v=document.getElementById('ssiSearchVille')?.value.trim().toUpperCase()||'',
          d=document.getElementById('ssiSearchDept')?.value.trim().toUpperCase()||'',
          s=document.getElementById('ssiSearchSecteur')?.value.trim().toUpperCase()||'';
    
    ssiFilteredData=ssiAllData.filter(i=>{
        let match=(!c||i.code.includes(c))&&
            (!n||i.nom.includes(n))&&
            (!v||i.ville.includes(v))&&
            (!d||i.dept.includes(d))&&
            (!s||i.secteur===s)&&
            (ssiSelectedTechs.size===0||ssiSelectedTechs.has(i.tech));
        
        if(match&&ssiActiveFilters.bpbt){
            match=ssiIsEmpty(i.bp)&&ssiIsEmpty(i.bt);
        }
        
        if(match&&ssiActiveFilters.bqbv){
            match=ssiIsEmpty(i.bq)&&ssiIsEmpty(i.bv);
        }
        
        return match;
    });
    
    if(ssiCurrentSort.column){
        const tmpCol=ssiCurrentSort.column;
        const tmpDir=ssiCurrentSort.direction;
        ssiCurrentSort={column:null,direction:null};
        ssiSortTable(tmpCol);
        if(tmpDir==='desc'){
            ssiSortTable(tmpCol);
        }
        return;
    }
    
    ssiDisplayData(ssiFilteredData);
    ssiUpdateStats();
    ssiUpdateFilterCounter();
}

// COPIE EXACTE ligne 451-455
function ssiDisplayData(data){
    const tbody=document.getElementById('ssiSearchTableBody');
    if(!tbody)return;
    tbody.innerHTML=data.length===0?
        '<tr><td colspan="15" style="text-align:center;padding:60px;color:#999;">🔍 Aucun résultat</td></tr>':
        data.map((i,idx)=>`<tr onclick="ssiShowSiteDetails(${idx})" style="cursor:pointer;border-bottom:1px solid var(--border-subtle);" onmouseover="this.style.background='var(--bg-elevated)'" onmouseout="this.style.background='transparent'"><td style="padding:12px;"><strong>${i.tech}</strong></td><td style="padding:12px;">${i.nom}</td><td style="padding:12px;">${i.ville}</td><td style="padding:12px;">${i.code}</td><td style="padding:12px;">${i.site}</td><td style="padding:12px;">${i.dept}</td><td style="padding:12px;">${i.nbVisite}</td><td style="padding:12px;">${i.nbHeure}</td><td style="padding:12px;">${i.techBinomeAffich}</td><td style="padding:12px;">${i.bk||'-'}</td><td style="padding:12px;">${i.bt||'-'}</td><td style="padding:12px;">${i.bp||'-'}</td><td style="padding:12px;">${i.bv||'-'}</td><td style="padding:12px;">${i.bq||'-'}</td><td style="padding:12px;"><strong>${idx+1}</strong></td></tr>`).join('');
}

// COPIE EXACTE ligne 457-511
function ssiUpdateStats(){
    const tS={},tB={};
    let sB=0;
    ssiFilteredData.forEach(i=>{
        if(!tS[i.tech])tS[i.tech]=0;
        tS[i.tech]+=i.heureCalc;
        if(i.estBinome&&i.techBinome){
            if(!tB[i.techBinome])tB[i.techBinome]=0;
            tB[i.techBinome]+=i.heureCalc;
            sB++;
        }
    });
    
    const pS={s1:[],s2:[],s3:[],autres:[]};
    Object.keys(tS).forEach(t=>{
        const s=t.slice(-2).toUpperCase()==='S1'?'s1':t.slice(-2).toUpperCase()==='S2'?'s2':t.slice(-2).toUpperCase()==='S3'?'s3':'autres';
        let e=pS[s].find(x=>x.nom===t);
        if(e)e.heureSeul+=tS[t];
        else pS[s].push({nom:t,heureSeul:tS[t],heureBinome:0});
    });
    
    Object.keys(tB).forEach(t=>{
        const s=t.slice(-2).toUpperCase()==='S1'?'s1':t.slice(-2).toUpperCase()==='S2'?'s2':t.slice(-2).toUpperCase()==='S3'?'s3':'autres';
        let e=pS[s].find(x=>x.nom===t);
        if(e)e.heureBinome+=tB[t];
        else pS[s].push({nom:t,heureSeul:0,heureBinome:tB[t]});
    });
    
    Object.keys(pS).forEach(s=>pS[s].sort((a,b)=>(b.heureSeul+b.heureBinome)-(a.heureSeul+a.heureBinome)));
    
    let totS=0,totB=0;
    
    [{k:'s1',c:'ssiTechS1'},{k:'s2',c:'ssiTechS2'},{k:'s3',c:'ssiTechS3'},{k:'autres',c:'ssiTechAutres'}].forEach(sec=>{
        const col=document.getElementById(sec.c);
        if(!col)return;
        const tSeul=pS[sec.k].reduce((s,t)=>s+(t.heureSeul||0),0),tBin=pS[sec.k].reduce((s,t)=>s+(t.heureBinome||0),0);
        totS+=tSeul;
        totB+=tBin;
        if(pS[sec.k].length===0)col.innerHTML=`<div style="color:var(--text-muted);font-size:0.9em;text-align:center;padding:10px;">Aucun</div>`;
        else col.innerHTML=pS[sec.k].map(t=>`<div style="background:var(--${sec.k==='autres'?'autres':sec.k}-color);color:white;padding:10px 12px;border-radius:var(--radius-sm);margin-bottom:8px;"><div style="font-weight:600;font-size:0.9em;">${t.nom}</div><div style="font-size:0.85em;opacity:0.9;">${(t.heureSeul||0).toFixed(1)}h seul / ${(t.heureBinome||0).toFixed(1)}h binôme</div></div>`).join('');
    });
    
    const elSeul=document.getElementById('ssiHeuresSeul');
    const elBinome=document.getElementById('ssiHeuresBinome');
    const elTotal=document.getElementById('ssiTotalHeures');
    const elSites=document.getElementById('ssiSitesTotal');
    const elSitesSeul=document.getElementById('ssiSitesSeul');
    const elSitesBinome=document.getElementById('ssiSitesBinome');
    if(elSeul)elSeul.textContent=totS.toFixed(1);
    if(elBinome)elBinome.textContent=totB.toFixed(1);
    if(elTotal)elTotal.textContent=(totS+totB).toFixed(1);
    if(elSites)elSites.textContent=ssiFilteredData.length;
    if(elSitesSeul)elSitesSeul.textContent=ssiFilteredData.length-sB;
    if(elSitesBinome)elSitesBinome.textContent=sB;
}

// COPIE EXACTE ligne 513-530
function ssiResetFilters(){
    ['ssiSearchCode','ssiSearchNom','ssiSearchVille','ssiSearchDept'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    const sectEl=document.getElementById('ssiSearchSecteur');if(sectEl)sectEl.value='';
    ssiActiveFilters={bpbt:false,bqbv:false};
    ssiSelectedTechs.clear();
    const btn1=document.getElementById('ssiFilterV1');
    const btn2=document.getElementById('ssiFilterV2');
    if(btn1){btn1.classList.remove('active');btn1.style.background='var(--bg-elevated)';btn1.style.color='var(--text-secondary)';}
    if(btn2){btn2.classList.remove('active');btn2.style.background='var(--bg-elevated)';btn2.style.color='var(--text-secondary)';}
    ssiCurrentSort={column:null,direction:null};
    ssiFilteredData=[...ssiAllData];
    ssiDisplayData(ssiFilteredData);
    ssiUpdateStats();
    ssiUpdateSortIcons();
    ssiUpdateFilterCounter();
    ssiUpdateTechFilterButtonLabel();
    if(ssiTechFilterOpen){ssiUpdateTechCheckboxList();}
}

// Index courant pour navigation
let ssiCurrentDetailIndex = 0;

// COPIE EXACTE ligne 532-599
function ssiShowSiteDetails(idx){
    if(idx>=ssiFilteredData.length)return;
    ssiCurrentDetailIndex = idx;
    const dataItem = ssiFilteredData[idx];
    const originalIdx = dataItem.idx;
    const{row,tv}=ssiFullDataRows[originalIdx];
    const g=i=>String(row[i]||'').trim();
    const b=i=>{const v=String(row[i]||'').toLowerCase();return v==='vrai'||v==='true'||v==='1'||v==='oui'||v==='x';};
    const chk=i=>`<div style="display:flex;align-items:center;gap:3px;"><div style="width:12px;height:12px;border:1px solid #667eea;border-radius:2px;display:flex;align-items:center;justify-content:center;background:${b(i)?'#667eea':'#fff'};">${b(i)?'<span style="color:white;font-weight:700;font-size:8px;">✓</span>':''}</div><span style="font-size:0.85em;">${b(i)?'OUI':'NON'}</span></div>`;
    const val=i=>{const v=g(i);if(v===''||v.toUpperCase()==='UNDEFINED'||v.toUpperCase()==='NAN')return '-';return v;};
    const fmtDate=i=>{const v=g(i);if(v===''||v.toUpperCase()==='UNDEFINED'||v.toUpperCase()==='NAN')return '-';const num=parseFloat(v);if(!isNaN(num)&&num>25569&&num<60000){const d=new Date((num-25569)*86400*1000);const day=String(d.getDate()).padStart(2,'0');const month=String(d.getMonth()+1).padStart(2,'0');const year=d.getFullYear();return day+'/'+month+'/'+year;}const d=new Date(v);if(!isNaN(d.getTime())){const day=String(d.getDate()).padStart(2,'0');const month=String(d.getMonth()+1).padStart(2,'0');const year=d.getFullYear();return day+'/'+month+'/'+year;}return v;};
    const tech2Cle=String(row[78]||'').trim().toUpperCase();
    const tech2Nom=ssiTechMapping[tech2Cle]||tech2Cle||'-';
    const sttCle=String(row[128]||'').trim().toUpperCase();
    const sttNom=ssiSttMapping[sttCle]||sttCle||'-';
    const prix=g(115);
    const prixF=prix&&prix!==''&&prix.toUpperCase()!=='UNDEFINED'?prix+' €':'-';
    const titleEl=document.getElementById('ssiModalTitle');
    const bodyEl=document.getElementById('ssiModalBody');
    // Mise à jour boutons navigation
    const prevBtn=document.getElementById('ssiPrevBtn');
    const nextBtn=document.getElementById('ssiNextBtn');
    if(prevBtn)prevBtn.disabled=ssiCurrentDetailIndex===0;
    if(nextBtn)nextBtn.disabled=ssiCurrentDetailIndex>=ssiFilteredData.length-1;
    if(prevBtn)prevBtn.style.opacity=ssiCurrentDetailIndex===0?'0.5':'1';
    if(nextBtn)nextBtn.style.opacity=ssiCurrentDetailIndex>=ssiFilteredData.length-1?'0.5':'1';
    if(titleEl)titleEl.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:0.85em;"><span>🏢 ${val(5)} - ${val(7)} | Code: ${val(0)}</span><span style="font-size:0.8em;color:#666;">${ssiCurrentDetailIndex+1}/${ssiFilteredData.length}</span><span style="background:linear-gradient(135deg,#f093fb,#f5576c);color:white;padding:3px 10px;border-radius:15px;font-size:0.85em;font-weight:700;">💰 ${prixF}</span></div>`;
    if(bodyEl)bodyEl.innerHTML=`
<div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:8px;align-items:start;">
<div>
<div style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:4px 8px;border-radius:4px;margin-bottom:4px;font-size:0.85em;font-weight:600;">📋 INFO CLIENT / SITE</div>
<table style="width:100%;border-collapse:collapse;background:white;border-radius:4px;overflow:hidden;font-size:0.9em;">
<tr style="border-bottom:1px solid #e9ecef;"><td style="padding:3px 6px;font-weight:600;color:#555;background:#f8f9fa;width:45%;">Client_Num</td><td style="padding:3px 6px;">${val(0)}</td></tr>
<tr style="border-bottom:1px solid #e9ecef;"><td style="padding:3px 6px;font-weight:600;color:#555;background:#f8f9fa;">Nom du site</td><td style="padding:3px 6px;">${val(5)}</td></tr>
<tr style="border-bottom:1px solid #e9ecef;"><td style="padding:3px 6px;font-weight:600;color:#555;background:#f8f9fa;">Ville</td><td style="padding:3px 6px;">${val(7)}</td></tr>
<tr style="border-bottom:1px solid #e9ecef;"><td style="padding:3px 6px;font-weight:600;color:#555;background:#f8f9fa;">Type contrat SSI</td><td style="padding:3px 6px;">${val(16)}</td></tr>
<tr style="border-bottom:1px solid #e9ecef;"><td style="padding:3px 6px;font-weight:600;color:#555;background:#f8f9fa;">Technicien</td><td style="padding:3px 6px;">${tv}</td></tr>
<tr style="border-bottom:1px solid #e9ecef;"><td style="padding:3px 6px;font-weight:600;color:#555;background:#f8f9fa;">Nb Visites</td><td style="padding:3px 6px;">${val(18)}</td></tr>
<tr style="border-bottom:1px solid #e9ecef;"><td style="padding:3px 6px;font-weight:600;color:#555;background:#f8f9fa;">Nb heures</td><td style="padding:3px 6px;">${val(59)}</td></tr>
<tr style="border-bottom:1px solid #e9ecef;"><td style="padding:3px 6px;font-weight:600;color:#555;background:#f8f9fa;">Nb Tech</td><td style="padding:3px 6px;">${val(60)}</td></tr>
<tr style="border-bottom:1px solid #e9ecef;"><td style="padding:3px 6px;font-weight:600;color:#555;background:#f8f9fa;">Tech 2</td><td style="padding:3px 6px;">${tech2Nom}</td></tr>
<tr style="border-bottom:1px solid #e9ecef;"><td style="padding:3px 6px;font-weight:600;color:#555;background:#f8f9fa;">Centrale 1</td><td style="padding:3px 6px;">${val(37)} / ${val(39)}</td></tr>
<tr style="border-bottom:1px solid #e9ecef;"><td style="padding:3px 6px;font-weight:600;color:#555;background:#f8f9fa;">Centrale 2</td><td style="padding:3px 6px;">${val(38)} / ${val(40)}</td></tr>
<tr style="border-bottom:1px solid #e9ecef;"><td style="padding:3px 6px;font-weight:600;color:#555;background:#f8f9fa;">Astreinte 2H</td><td style="padding:3px 6px;">${chk(30)}</td></tr>
<tr style="border-bottom:1px solid #e9ecef;"><td style="padding:3px 6px;font-weight:600;color:#555;background:#f8f9fa;">Astreinte 4H</td><td style="padding:3px 6px;">${chk(31)}</td></tr>
<tr style="border-bottom:1px solid #e9ecef;"><td style="padding:3px 6px;font-weight:600;color:#555;background:#f8f9fa;">Astr intrusion</td><td style="padding:3px 6px;">${chk(32)}</td></tr>
<tr style="border-bottom:1px solid #e9ecef;"><td style="padding:3px 6px;font-weight:600;color:#555;background:#f8f9fa;">Premium intrusion</td><td style="padding:3px 6px;">${chk(17)}</td></tr>
<tr style="border-bottom:1px solid #e9ecef;"><td style="padding:3px 6px;font-weight:600;color:#555;background:#f8f9fa;">Intrusion</td><td style="padding:3px 6px;">${chk(36)}</td></tr>
</table>
</div>
<div>
<div style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:4px 8px;border-radius:4px;margin-bottom:4px;font-size:0.85em;font-weight:600;">📅 PLANNING SSI</div>
<table style="width:100%;border-collapse:collapse;background:white;border-radius:4px;overflow:hidden;font-size:0.9em;">
<tr style="border-bottom:1px solid #e9ecef;"><td style="padding:3px 6px;font-weight:600;color:#555;background:#f8f9fa;width:60%;">V0 date max (BK)</td><td style="padding:3px 6px;">${fmtDate(62)}</td></tr>
<tr style="border-bottom:1px solid #e9ecef;"><td style="padding:3px 6px;font-weight:600;color:#555;background:#f8f9fa;">${YEAR_COLS.V1} (BP)</td><td style="padding:3px 6px;">${fmtDate(67)}</td></tr>
<tr style="border-bottom:1px solid #e9ecef;"><td style="padding:3px 6px;font-weight:600;color:#555;background:#f8f9fa;">${YEAR_COLS.V2} (BQ)</td><td style="padding:3px 6px;">${fmtDate(68)}</td></tr>
<tr style="border-bottom:1px solid #e9ecef;"><td style="padding:3px 6px;font-weight:600;color:#555;background:#f8f9fa;">PL 1er sem (BT)</td><td style="padding:3px 6px;">${fmtDate(71)}</td></tr>
<tr style="border-bottom:1px solid #e9ecef;"><td style="padding:3px 6px;font-weight:600;color:#555;background:#f8f9fa;">PL 2eme sem (BV)</td><td style="padding:3px 6px;">${fmtDate(73)}</td></tr>
</table>
<div style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:4px 8px;border-radius:4px;margin:6px 0 4px;font-size:0.85em;font-weight:600;">🔄 RECO</div>
<table style="width:100%;border-collapse:collapse;background:white;border-radius:4px;overflow:hidden;font-size:0.9em;">
<tr style="border-bottom:1px solid #e9ecef;"><td style="padding:3px 6px;font-weight:600;color:#555;background:#f8f9fa;width:60%;">Prépayé</td><td style="padding:3px 6px;">${chk(22)}</td></tr>
<tr style="border-bottom:1px solid #e9ecef;"><td style="padding:3px 6px;font-weight:600;color:#555;background:#f8f9fa;">Recond ${YEAR_COLS.annee}</td><td style="padding:3px 6px;">${val(89)}</td></tr>
<tr style="border-bottom:1px solid #e9ecef;"><td style="padding:3px 6px;font-weight:600;color:#555;background:#f8f9fa;">Recond</td><td style="padding:3px 6px;">${val(21)}</td></tr>
<tr style="border-bottom:1px solid #e9ecef;"><td style="padding:3px 6px;font-weight:600;color:#555;background:#f8f9fa;">PL recond</td><td style="padding:3px 6px;">${fmtDate(91)}</td></tr>
<tr style="border-bottom:1px solid #e9ecef;"><td style="padding:3px 6px;font-weight:600;color:#555;background:#f8f9fa;">Recond expe</td><td style="padding:3px 6px;">${fmtDate(101)}</td></tr>
<tr style="border-bottom:1px solid #e9ecef;"><td style="padding:3px 6px;font-weight:600;color:#555;background:#f8f9fa;">Recond recup</td><td style="padding:3px 6px;">${val(26)}</td></tr>
</table>
</div>
<div>
<div style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:4px 8px;border-radius:4px;margin-bottom:4px;font-size:0.85em;font-weight:600;">🚒 DSF</div>
<table style="width:100%;border-collapse:collapse;background:white;border-radius:4px;overflow:hidden;font-size:0.9em;">
<tr style="border-bottom:1px solid #e9ecef;"><td style="padding:3px 6px;font-weight:600;color:#555;background:#f8f9fa;width:60%;">Débits</td><td style="padding:3px 6px;">${chk(92)}</td></tr>
<tr style="border-bottom:1px solid #e9ecef;"><td style="padding:3px 6px;font-weight:600;color:#555;background:#f8f9fa;">Blocs</td><td style="padding:3px 6px;">${chk(93)}</td></tr>
<tr style="border-bottom:1px solid #e9ecef;"><td style="padding:3px 6px;font-weight:600;color:#555;background:#f8f9fa;">Infiltro</td><td style="padding:3px 6px;">${chk(94)}</td></tr>
<tr style="border-bottom:1px solid #e9ecef;"><td style="padding:3px 6px;font-weight:600;color:#555;background:#f8f9fa;">Extincteurs</td><td style="padding:3px 6px;">${chk(95)}</td></tr>
<tr style="border-bottom:1px solid #e9ecef;"><td style="padding:3px 6px;font-weight:600;color:#555;background:#f8f9fa;">Désenfumage</td><td style="padding:3px 6px;">${chk(80)}</td></tr>
<tr style="border-bottom:1px solid #e9ecef;"><td style="padding:3px 6px;font-weight:600;color:#555;background:#f8f9fa;">Date fin DSF</td><td style="padding:3px 6px;">${fmtDate(28)}</td></tr>
<tr style="border-bottom:1px solid #e9ecef;"><td style="padding:3px 6px;font-weight:600;color:#555;background:#f8f9fa;">Date CE DSF</td><td style="padding:3px 6px;">${fmtDate(86)}</td></tr>
<tr style="border-bottom:1px solid #e9ecef;"><td style="padding:3px 6px;font-weight:600;color:#555;background:#f8f9fa;">Sous traitant</td><td style="padding:3px 6px;">${sttNom}</td></tr>
<tr style="border-bottom:1px solid #e9ecef;"><td style="padding:3px 6px;font-weight:600;color:#555;background:#f8f9fa;">Mois STT</td><td style="padding:3px 6px;">${val(129)}</td></tr>
</table>
</div>
</div>`;
    const modal=document.getElementById('ssiSiteModal');
    if(modal)modal.classList.add('active');
}

// COPIE EXACTE ligne 601-603
function ssiCloseModal(){
    const modal=document.getElementById('ssiSiteModal');
    if(modal)modal.classList.remove('active');
}

// COPIE EXACTE ligne 605-615
function ssiUpdateFilterCounter(){
    const counter=document.getElementById('ssiFilterCounter');
    const counterValue=document.getElementById('ssiCounterValue');
    const hasActiveFilter=ssiActiveFilters.bpbt||ssiActiveFilters.bqbv;
    if(counter){
        if(hasActiveFilter){
            counter.style.display='block';
            if(counterValue)counterValue.textContent=ssiFilteredData.length;
        }else{
            counter.style.display='none';
        }
    }
}

// Interface SEARCHSSI pour le reste de l'app
const SEARCHSSI = {
    init() {
        ssiInitFromAppData();
        // Event listeners
        ['ssiSearchCode','ssiSearchNom','ssiSearchVille','ssiSearchDept'].forEach(id=>{
            const el=document.getElementById(id);
            if(el)el.addEventListener('input',()=>ssiFilterData());
        });
        const sectEl=document.getElementById('ssiSearchSecteur');
        if(sectEl)sectEl.addEventListener('change',()=>ssiOnSecteurChange());
    },
    toggleFilter(type) { ssiToggleFilter(type==='v1'?'bpbt':'bqbv'); },
    sort(col) { ssiSortTable(col); },
    reset() { ssiResetFilters(); },
    closeModal() { ssiCloseModal(); },
    showDetail(idx) { ssiShowSiteDetails(idx); },
    prev() { if(ssiCurrentDetailIndex>0) ssiShowSiteDetails(ssiCurrentDetailIndex-1); },
    next() { if(ssiCurrentDetailIndex<ssiFilteredData.length-1) ssiShowSiteDetails(ssiCurrentDetailIndex+1); },
    filterByTech(tech) {
        ssiSelectedTechs.clear();
        ssiSelectedTechs.add(tech);
        ssiUpdateTechFilterButtonLabel();
        ssiFilterData();
    }
};

// Fermer le dropdown TECH quand on clique ailleurs - COPIE EXACTE ligne 168-176
document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('ssiTechFilterDropdown');
    const btn = document.getElementById('ssiTechFilterBtn');
    if (dropdown && btn && !dropdown.contains(e.target) && e.target !== btn) {
        ssiTechFilterOpen = false;
        dropdown.style.display = 'none';
    }
});

// ============================================
// MODULE PRODUITS - LOGIQUE
// ============================================

console.log('✅ searchssi.js chargé');
