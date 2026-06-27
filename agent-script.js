// agent-script.js - Version complète et corrigée

// ========== SONS PERSONNALISÉS ==========
let clickSoundA = null;
let successSoundA = null;
let errorSoundA = null;

function loadSoundsA() {
    try {
        clickSoundA = new Audio('assets/sounds/click.mp3');
        successSoundA = new Audio('assets/sounds/success.mp3');
        errorSoundA = new Audio('assets/sounds/error.mp3');
        clickSoundA.load();
        successSoundA.load();
        errorSoundA.load();
    } catch(e) {
        console.log('Sons non disponibles');
    }
}

function playSoundA(type) {
    try {
        if (type === 'click' && clickSoundA) {
            clickSoundA.currentTime = 0;
            clickSoundA.play().catch(e => {});
        } else if (type === 'success' && successSoundA) {
            successSoundA.currentTime = 0;
            successSoundA.play().catch(e => {});
        } else if (type === 'error' && errorSoundA) {
            errorSoundA.currentTime = 0;
            errorSoundA.play().catch(e => {});
        }
    } catch(e) {}
}

loadSoundsA();

// ========== TOAST ==========
function showToastA(message, type = 'info') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

function logout() {
    playSoundA('click');
    sessionStorage.removeItem('user');
    window.location.href = 'index.html';
}

// ========== TABLEAU DE BORD AGENT ==========
let agentFiltre = 'all';

async function loadAgentDashboard() {
    try {
        const user = JSON.parse(sessionStorage.getItem('user') || '{}');
        document.getElementById('agentName').textContent = user.nom || 'Agent';

        const today = new Date();
        today.setHours(0,0,0,0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const snapshot = await db.collection('commandes')
            .where('dateCreation', '>=', today)
            .where('dateCreation', '<', tomorrow)
            .get();

        let appeler = 0, encours = 0, livree = 0;
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.statut === 'À appeler') appeler++;
            else if (data.statut === 'En-cours') encours++;
            else if (data.statut === 'Livrée') livree++;
        });
        document.getElementById('statAppeler').textContent = appeler;
        document.getElementById('statEncours').textContent = encours;
        document.getElementById('statLivree').textContent = livree;
        updateAlerteA(appeler);
        loadAgentCommandes();
        loadVendeursForSelectA('stockVendeurSelectAgent');
        loadVendeursForSelectA('commandeVendeurSelectAgent');
    } catch(e) { console.error(e); }
}

function updateAlerteA(count) {
    const alerte = document.getElementById('alerteAppels');
    const countEl = document.getElementById('appelCount');
    countEl.textContent = count;
    if (count > 0) {
        alerte.className = 'alerte-appels';
        alerte.innerHTML = `<div class="message"><span class="count">${count}</span> commande(s) en attente</div>
            <button class="btn-lancer" onclick="lancerAppelSuivantA()">🔴 Lancer la campagne</button>`;
    } else {
        alerte.className = 'alerte-appels ok';
        alerte.innerHTML = `<div class="message">✅ Aucune commande en attente d'appel</div>`;
    }
}

// ========== COMMANDES AGENT ==========
async function loadAgentCommandes() {
    try {
        const today = new Date();
        today.setHours(0,0,0,0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        let query = db.collection('commandes')
            .where('dateCreation', '>=', today)
            .where('dateCreation', '<', tomorrow)
            .orderBy('dateCreation', 'desc');
        if (agentFiltre && agentFiltre !== 'all') query = query.where('statut', '==', agentFiltre);
        const snapshot = await query.get();
        const container = document.getElementById('agentCommandesContainer');
        if (snapshot.empty) { container.innerHTML = '<p class="empty-message">Aucune commande aujourd\'hui.</p>'; return; }
        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const sc = data.statut === 'Livrée' ? 'statut-livree' : data.statut === 'À appeler' ? 'statut-appel' : 'statut-attente';
            html += `<div class="commande-item" onclick="afficherCommandeA('${doc.id}')">
                <span class="numero">${data.numero||'N/A'}</span>
                <span class="localisation">📍 ${data.quartier||''}, ${data.ville||''}</span>
                <span class="vendeur">${data.vendeur||'N/A'}</span>
                <span class="montant">${data.prixTotal||0} FCFA</span>
                <span class="statut ${sc}">${data.statut||'N/A'}</span>
                <span class="actions">
                    <button onclick="event.stopPropagation(); modifierCommandeA('${doc.id}')" title="Modifier">✏️</button>
                    <button onclick="event.stopPropagation(); supprimerCommandeA('${doc.id}')" title="Supprimer">🗑️</button>
                    <button onclick="event.stopPropagation(); afficherCommandeA('${doc.id}')" title="Voir">👁️</button>
                </span>
            </div>`;
        });
        container.innerHTML = html;
    } catch(e) { console.error(e); }
}

function filtrerAgentCommandes(statut) {
    playSoundA('click');
    agentFiltre = statut;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === statut));
    loadAgentCommandes();
}

// ========== COMMANDES CRUD AGENT ==========
async function afficherCommandeA(id) {
    playSoundA('click');
    try {
        const doc = await db.collection('commandes').doc(id).get();
        const data = doc.data();
        if (!data) { showToastA('⚠️ Commande non trouvée.', 'error'); return; }
        const articles = data.articles ? data.articles.map(a => `${a.quantite} x ${a.nom}`).join('\n') : 'Aucun';
        alert(`📋 COMMANDE ${data.numero||'N/A'}\n\nVendeur: ${data.vendeur||'N/A'}\n📦 Articles:\n${articles}\n💰 ${data.prixTotal||0} FCFA\n📍 ${data.quartier||''}, ${data.ville||''}\n📌 ${data.statut||'N/A'}`);
    } catch(e) { showToastA('❌ Erreur affichage.', 'error'); }
}

async function modifierCommandeA(id) {
    playSoundA('click');
    await openCommandeModalAgent(id);
}

async function supprimerCommandeA(id) {
    playSoundA('click');
    if (!confirm('⚠️ Supprimer définitivement cette commande ?')) return;
    try {
        await db.collection('commandes').doc(id).delete();
        playSoundA('success');
        showToastA('🗑️ Commande supprimée.', 'success');
        loadAgentDashboard();
    } catch(e) { showToastA('❌ Erreur suppression.', 'error'); }
}

// ========== APPELS AGENT ==========
let fileAppelA = [];
let indexAppelA = 0;

function lancerAppelSuivantA() {
    playSoundA('click');
    db.collection('commandes').where('statut','==','À appeler').orderBy('dateCreation','asc').get()
        .then(snapshot => {
            if (snapshot.empty) { showToastA('✅ Aucune commande en attente.', 'success'); return; }
            fileAppelA = []; snapshot.forEach(doc => fileAppelA.push({ id: doc.id, data: doc.data() }));
            indexAppelA = 0;
            afficherAppelA();
        })
        .catch(e => { console.error(e); showToastA('❌ Erreur chargement appels.', 'error'); });
}

function afficherAppelA() {
    if (indexAppelA >= fileAppelA.length) {
        fermerAppelModalA();
        showToastA('✅ Tous les appels traités !', 'success');
        loadAgentDashboard();
        return;
    }
    const item = fileAppelA[indexAppelA];
    const data = item.data;
    const modal = document.getElementById('appelModalAgent');
    const content = document.getElementById('appelContentAgent');
    const articles = data.articles ? data.articles.map(a => `${a.quantite} x ${a.nom}`).join(', ') : '';
    content.innerHTML = `
        <div class="step-title">📞 APPEL CLIENT</div>
        <div class="step-subtitle">Bon ${indexAppelA+1} sur ${fileAppelA.length}</div>
        <div class="recap-item"><span>Commande</span><span>${data.numero}</span></div>
        <div class="recap-item"><span>Vendeur</span><span>${data.vendeur}</span></div>
        <div class="recap-item"><span>Articles</span><span>${articles}</span></div>
        <div class="recap-item"><span>Lieu</span><span>${data.quartier}, ${data.ville}</span></div>
        <div class="recap-item"><span>Montant</span><span>${data.prixTotal} FCFA</span></div>
        <div style="margin:16px 0;display:flex;gap:10px;flex-wrap:wrap;">
            <button onclick="appelerClientA('${item.id}')" class="btn-primary" style="flex:1;">📞 Appeler</button>
            <button onclick="whatsappClientA('${item.id}')" class="btn-primary" style="flex:1;background:#25D366;">💬 WhatsApp</button>
        </div>
        <div style="margin:16px 0;display:flex;gap:10px;flex-wrap:wrap;">
            <button onclick="validerAppelA('${item.id}','Validé')" class="btn-success" style="flex:1;padding:12px;">✅ Validé</button>
            <button onclick="validerAppelA('${item.id}','Reporté')" class="btn-secondary" style="flex:1;padding:12px;">📅 Reporté</button>
            <button onclick="validerAppelA('${item.id}','Refusé')" class="btn-danger" style="flex:1;padding:12px;">❌ Refusé</button>
        </div>
        <p class="info-text">Le prochain bon apparaîtra automatiquement.</p>`;
    modal.classList.add('active');
}

function fermerAppelModalA() { document.getElementById('appelModalAgent').classList.remove('active'); }

document.getElementById('appelModalAgent').addEventListener('click', function(e) {
    if (e.target === this) fermerAppelModalA();
});

async function validerAppelA(id, statut) {
    try {
        await db.collection('commandes').doc(id).update({ statut: statut, dateAppel: new Date() });
        playSoundA('success');
        indexAppelA++;
        afficherAppelA();
        loadAgentDashboard();
    } catch(e) { showToastA('❌ Erreur.', 'error'); }
}

function appelerClientA(id) {
    playSoundA('click');
    db.collection('commandes').doc(id).get().then(doc => {
        const data = doc.data();
        showToastA('📞 Appel en cours...', 'info');
        setTimeout(() => {
            if (confirm('Le client a-t-il répondu ?')) { validerAppelA(id, 'Validé'); }
            else { showToastA('📞 Client injoignable.', 'info'); }
        }, 1500);
    });
}

function whatsappClientA(id) {
    playSoundA('click');
    db.collection('commandes').doc(id).get().then(doc => {
        const data = doc.data();
        const phone = prompt('Numéro WhatsApp du client :');
        if (phone) {
            window.open(`https://wa.me/${phone.replace('+','')}?text=Bonjour, nous vous confirmons votre livraison (${data.numero}).`, '_blank');
        }
    });
}

// ========== MODALE NOUVELLE COMMANDE AGENT ==========
function switchModeAgent(mode) {
    playSoundA('click');
    document.getElementById('toggleSaisieAgent').classList.toggle('active', mode === 'saisie');
    document.getElementById('toggleCollageAgent').classList.toggle('active', mode === 'collage');
    document.getElementById('modeSaisieAgent').style.display = mode === 'saisie' ? 'block' : 'none';
    document.getElementById('modeCollageAgent').style.display = mode === 'collage' ? 'block' : 'none';
}

let isEditModeAgent = false;
let editCommandeIdAgent = null;

async function openCommandeModalAgent(commandeId) {
    playSoundA('click');
    isEditModeAgent = !!commandeId;
    editCommandeIdAgent = commandeId || null;
    resetCommandeFormAgent();
    await loadVendeursForSelectA('commandeVendeurSelectAgent');
    document.getElementById('commandeModalAgent').classList.add('active');
    if (isEditModeAgent) {
        await loadCommandeForEditAgent(commandeId);
    }
}

function closeCommandeModalAgent() {
    playSoundA('click');
    document.getElementById('commandeModalAgent').classList.remove('active');
    resetCommandeFormAgent();
    isEditModeAgent = false;
    editCommandeIdAgent = null;
}

function resetCommandeFormAgent() {
    document.getElementById('articlesContainerAgent').innerHTML = '';
    addArticleRowAgent();
    document.getElementById('commandePrixAgent').value = '';
    document.getElementById('commandeFraisInclusAgent').checked = true;
    document.getElementById('commandeZoneAgent').value = '';
    document.getElementById('commandeQuartierAgent').value = '';
    document.getElementById('commandeVilleAgent').value = '';
    document.getElementById('commandeNoteAgent').value = '';
    document.getElementById('collageInputAgent').value = '';
    document.getElementById('collageResultAgent').innerHTML = '';
    switchModeAgent('saisie');
}

async function loadCommandeForEditAgent(id) {
    const doc = await db.collection('commandes').doc(id).get();
    const data = doc.data();
    if (!data) return;
    if (data.vendeurId) {
        const select = document.getElementById('commandeVendeurSelectAgent');
        for(let i=0; i<select.options.length; i++) {
            if(select.options[i].value === data.vendeurId) { select.value = data.vendeurId; break; }
        }
    }
    const container = document.getElementById('articlesContainerAgent');
    container.innerHTML = '';
    if(data.articles && data.articles.length > 0) {
        data.articles.forEach(a => {
            const row = document.createElement('div');
            row.className = 'article-row';
            row.innerHTML = `<input type="number" class="article-qty" value="${a.quantite||1}" min="1" /><input type="text" class="article-name" value="${a.nom||''}" />`;
            container.appendChild(row);
        });
    } else { addArticleRowAgent(); }
    document.getElementById('commandePrixAgent').value = data.prixTotal || '';
    document.getElementById('commandeFraisInclusAgent').checked = data.fraisInclus !== undefined ? data.fraisInclus : true;
    document.getElementById('commandeZoneAgent').value = data.zone || '';
    document.getElementById('commandeQuartierAgent').value = data.quartier || '';
    document.getElementById('commandeVilleAgent').value = data.ville || '';
    document.getElementById('commandeNoteAgent').value = data.note || '';
}

async function saveCommandeAgent() {
    const select = document.getElementById('commandeVendeurSelectAgent');
    const vendeurId = select.value;
    if (!vendeurId) { showToastA('⚠️ Sélectionnez un vendeur.', 'error'); return; }
    const vendeurNom = select.options[select.selectedIndex].textContent;
    const rows = document.querySelectorAll('#articlesContainerAgent .article-row');
    const articles = [];
    rows.forEach(row => {
        const qty = row.querySelector('.article-qty').value;
        const name = row.querySelector('.article-name').value.trim();
        if (name) articles.push({ quantite: parseInt(qty)||1, nom: name });
    });
    if (articles.length === 0) { showToastA('⚠️ Ajoutez au moins un article.', 'error'); return; }
    const prix = parseInt(document.getElementById('commandePrixAgent').value);
    if (isNaN(prix) || prix <= 0) { showToastA('⚠️ Saisissez un prix valide.', 'error'); return; }
    const quartier = document.getElementById('commandeQuartierAgent').value.trim();
    const ville = document.getElementById('commandeVilleAgent').value.trim();
    if (!quartier || !ville) { showToastA('⚠️ Renseignez quartier ET ville.', 'error'); return; }
    const zone = document.getElementById('commandeZoneAgent').value;
    const fraisInclus = document.getElementById('commandeFraisInclusAgent').checked;
    const note = document.getElementById('commandeNoteAgent').value.trim();
    const zones = { 'Libreville':2000, 'Akanda':3000, 'Owendo':3000, 'Bikélé':3000, 'Autres':4000 };
    const fraisLivraison = fraisInclus ? 0 : (zones[zone] || 0);

    const data = {
        articles, prixTotal: prix, fraisInclus, fraisLivraison, zone, quartier, ville, note,
        vendeurId, vendeur: vendeurNom, statut: 'À appeler', dateCreation: new Date()
    };

    try {
        if (isEditModeAgent && editCommandeIdAgent) {
            await db.collection('commandes').doc(editCommandeIdAgent).update({ ...data, dateModification: new Date() });
            playSoundA('success');
            showToastA('✅ Commande mise à jour !', 'success');
        } else {
            const snapshot = await db.collection('commandes').get();
            const count = snapshot.size + 1;
            data.numero = `HDIX-${String(count).padStart(3, '0')}`;
            await db.collection('commandes').add(data);
            playSoundA('success');
            showToastA(`✅ Commande ${data.numero} enregistrée !`, 'success');
        }
        closeCommandeModalAgent();
        loadAgentDashboard();
    } catch(e) { console.error(e); showToastA('❌ Erreur enregistrement.', 'error'); }
}

function addArticleRowAgent() {
    playSoundA('click');
    const container = document.getElementById('articlesContainerAgent');
    const row = document.createElement('div');
    row.className = 'article-row';
    row.innerHTML = `<input type="number" class="article-qty" placeholder="Qté" min="1" value="1" /><input type="text" class="article-name" placeholder="Nom de l'article" />`;
    container.appendChild(row);
}

async function loadVendeursForSelectA(selectId) {
    try {
        const snapshot = await db.collection('vendeurs').orderBy('nom').get();
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">-- Sélectionnez un vendeur --</option>';
        snapshot.forEach(doc => {
            const data = doc.data();
            const opt = document.createElement('option');
            opt.value = doc.id;
            opt.textContent = data.nom;
            select.appendChild(opt);
        });
    } catch(e) { console.error(e); }
}

// ========== COLLAGE AGENT ==========
function analyserCollageAgent() {
    playSoundA('click');
    const text = document.getElementById('collageInputAgent').value.trim();
    if (!text) { showToastA('⚠️ Collez un texte.', 'error'); return; }
    const result = analyserTexteAgent(text);
    const container = document.getElementById('collageResultAgent');
    if (result.articles.length === 0) {
        container.innerHTML = '<div class="required-note" style="border-left-color:#c0392b;">⚠️ Aucun article détecté.</div>';
        return;
    }
    let html = `<div style="margin-top:16px;"><h4>📋 Commande détectée</h4><div class="recap-item"><span>Vendeur</span><span>${result.vendeur||'Non détecté'}</span></div>
        <div class="recap-item"><span>Articles</span><span>${result.articles.length}</span></div>
        <div class="recap-item" style="flex-direction:column;align-items:flex-start;padding:8px 0;">
        <strong>Détail :</strong><span>${result.articles.map(a=>`${a.quantite} x ${a.nom}`).join('<br>')}</span></div>
        <div class="recap-item"><span>Prix</span><span>${result.prix||'Non détecté'} FCFA</span></div>
        <div class="recap-item"><span>Lieu</span><span>${result.lieu||'Non détecté'}</span></div>
        <div style="margin-top:16px;display:flex;gap:10px;"><button onclick="validerCollageAgent()" class="btn-success" style="flex:1;padding:12px;">✅ Valider</button>
        <button onclick="closeCommandeModalAgent()" class="btn-secondary" style="flex:1;padding:12px;">Annuler</button></div></div>`;
    container.innerHTML = html;
    window._collageResultAgent = result;
}

function validerCollageAgent() {
    playSoundA('click');
    const result = window._collageResultAgent;
    if (!result) return;
    const container = document.getElementById('articlesContainerAgent');
    container.innerHTML = '';
    result.articles.forEach(a => {
        const row = document.createElement('div');
        row.className = 'article-row';
        row.innerHTML = `<input type="number" class="article-qty" value="${a.quantite}" min="1" /><input type="text" class="article-name" value="${a.nom}" />`;
        container.appendChild(row);
    });
    if (result.prix) document.getElementById('commandePrixAgent').value = result.prix;
    if (result.lieu) {
        const parts = result.lieu.split(',');
        if (parts.length >= 2) {
            document.getElementById('commandeQuartierAgent').value = parts[0].trim();
            document.getElementById('commandeVilleAgent').value = parts[1].trim();
        } else { document.getElementById('commandeQuartierAgent').value = result.lieu; }
    }
    if (result.vendeur) {
        const select = document.getElementById('commandeVendeurSelectAgent');
        for(let i=0; i<select.options.length; i++) {
            if(select.options[i].textContent === result.vendeur) { select.value = select.options[i].value; break; }
        }
    }
    switchModeAgent('saisie');
    document.getElementById('collageResultAgent').innerHTML = '';
    showToastA('✅ Données collées importées !', 'success');
}

function analyserTexteAgent(text) {
    const result = { articles: [], vendeur: '', prix: null, lieu: '' };
    const lines = text.split('\n').filter(l => l.trim());
    lines.forEach(line => {
        const trimmed = line.trim();
        const articleMatch = trimmed.match(/^(\d+)\s*[xX]?\s*(.+)$/);
        if (articleMatch) { result.articles.push({ quantite: parseInt(articleMatch[1]), nom: articleMatch[2].trim() }); return; }
        const prixMatch = trimmed.match(/(\d+[\s']?\d*)\s*F?CFA?/i);
        if (prixMatch && !result.prix) { result.prix = parseInt(prixMatch[1].replace(/\s/g,'')); return; }
        if (trimmed.includes('ville')||trimmed.includes('quartier')||trimmed.includes('Libreville')||trimmed.includes('Akanda')||trimmed.includes('Owendo')) { result.lieu = trimmed; return; }
        if (trimmed.includes('vendeur')||trimmed.includes('Vendeur')) { result.vendeur = trimmed.replace(/vendeur\s*/i,'').trim(); return; }
    });
    if (!result.lieu) { for(const line of lines) { if(line.length > 3 && line.length < 50 && !result.lieu) { result.lieu = line.trim(); } } }
    if (!result.vendeur) { result.vendeur = prompt('Vendeur pour cette commande :') || ''; }
    return result;
}

// ========== STOCK AGENT ==========
function openStockModalAgent() {
    playSoundA('click');
    document.getElementById('stockModalAgent').classList.add('active');
    loadVendeursForSelectA('stockVendeurSelectAgent');
    document.getElementById('stockArticlesContainerAgent').innerHTML = '';
    addStockRowAgent();
}

function closeStockModalAgent() {
    playSoundA('click');
    document.getElementById('stockModalAgent').classList.remove('active');
}

function addStockRowAgent() {
    playSoundA('click');
    const container = document.getElementById('stockArticlesContainerAgent');
    const row = document.createElement('div');
    row.className = 'article-row';
    row.innerHTML = `<input type="text" class="stock-article-name" placeholder="Nom de l'article" /><input type="number" class="stock-article-qty" placeholder="Quantité" min="1" value="1" />`;
    container.appendChild(row);
}

async function saveStockAgent() {
    const select = document.getElementById('stockVendeurSelectAgent');
    const vendeurId = select.value;
    if (!vendeurId) { showToastA('⚠️ Sélectionnez un vendeur.', 'error'); return; }
    const rows = document.querySelectorAll('#stockArticlesContainerAgent .article-row');
    const articles = [];
    rows.forEach(row => {
        const name = row.querySelector('.stock-article-name').value.trim();
        const qty = parseInt(row.querySelector('.stock-article-qty').value);
        if (name && qty > 0) articles.push({ nom: name, quantite: qty });
    });
    if (articles.length === 0) { showToastA('⚠️ Ajoutez au moins un article.', 'error'); return; }
    try {
        const vendeurDoc = await db.collection('vendeurs').doc(vendeurId).get();
        const vendeurNom = vendeurDoc.data().nom;
        for (const a of articles) {
            const existing = await db.collection('stock').where('vendeurId','==',vendeurId).where('nom','==',a.nom).get();
            if (existing.empty) { await db.collection('stock').add({ vendeurId, vendeurNom, nom: a.nom, quantite: a.quantite }); }
            else { const doc = existing.docs[0]; await db.collection('stock').doc(doc.id).update({ quantite: (doc.data().quantite||0) + a.quantite }); }
        }
        playSoundA('success');
        showToastA(`✅ Stock ajouté pour ${vendeurNom} !`, 'success');
        closeStockModalAgent();
        loadAgentDashboard();
    } catch(e) { console.error(e); showToastA('❌ Erreur stockage.', 'error'); }
}

// ========== CONSULTER STOCK AGENT ==========
async function consulterStockAgent() {
    playSoundA('click');
    document.getElementById('consulterStockModalAgent').classList.add('active');
    await rafraichirStockAgent();
}

function closeConsulterStockModalAgent() {
    playSoundA('click');
    document.getElementById('consulterStockModalAgent').classList.remove('active');
}

async function rafraichirStockAgent() {
    try {
        const snapshot = await db.collection('stock').get();
        const container = document.getElementById('stockListContainerAgent');
        if (snapshot.empty) { container.innerHTML = '<p class="empty-message">Aucun stock enregistré.</p>'; return; }
        let html = '<div class="list-container">';
        const vendeurs = {};
        snapshot.forEach(doc => {
            const data = doc.data();
            if (!vendeurs[data.vendeurId]) vendeurs[data.vendeurId] = { nom: data.vendeurNom || 'Inconnu', articles: [] };
            vendeurs[data.vendeurId].articles.push({ id: doc.id, nom: data.nom, quantite: data.quantite || 0 });
        });
        for (const [vid, v] of Object.entries(vendeurs)) {
            html += `<div style="font-weight:700;padding:8px 0;border-top:1px solid #e2e8f0;">🏪 ${v.nom}</div>`;
            v.articles.forEach(a => {
                html += `<div class="list-item"><div><strong>${a.nom}</strong><br><small>${a.quantite} unités</small></div>
                    <div><button onclick="retirerStockAgent('${a.id}')" class="btn-delete">➖ Retirer</button></div></div>`;
            });
        }
        html += '</div>';
        container.innerHTML = html;
    } catch(e) { console.error(e); }
}

async function retirerStockAgent(id) {
    const qty = prompt('Quantité à retirer :');
    if (!qty) return;
    const num = parseInt(qty);
    if (isNaN(num) || num <= 0) { showToastA('⚠️ Quantité invalide.', 'error'); return; }
    try {
        const doc = await db.collection('stock').doc(id).get();
        const data = doc.data();
        const newQty = (data.quantite || 0) - num;
        if (newQty < 0) { showToastA('⚠️ Stock insuffisant.', 'error'); return; }
        if (newQty === 0) { await db.collection('stock').doc(id).delete(); }
        else { await db.collection('stock').doc(id).update({ quantite: newQty }); }
        playSoundA('success');
        showToastA('✅ Stock retiré avec succès !', 'success');
        await rafraichirStockAgent();
        loadAgentDashboard();
    } catch(e) { console.error(e); showToastA('❌ Erreur retrait.', 'error'); }
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', function() {
    const user = sessionStorage.getItem('user');
    if (!user) { window.location.href = 'index.html'; return; }
    try {
        const u = JSON.parse(user);
        document.getElementById('agentName').textContent = u.nom || 'Agent';
        if (u.role !== 'agent') { window.location.href = 'index.html'; return; }
    } catch { window.location.href = 'index.html'; return; }
    loadAgentDashboard();

    // Fermer les modales en cliquant sur le fond
    document.getElementById('commandeModalAgent').addEventListener('click', function(e) {
        if (e.target === this) closeCommandeModalAgent();
    });
    document.getElementById('stockModalAgent').addEventListener('click', function(e) {
        if (e.target === this) closeStockModalAgent();
    });
    document.getElementById('consulterStockModalAgent').addEventListener('click', function(e) {
        if (e.target === this) closeConsulterStockModalAgent();
    });
    document.getElementById('appelModalAgent').addEventListener('click', function(e) {
        if (e.target === this) fermerAppelModalA();
    });
});