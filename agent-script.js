// agent-script.js - Version complète avec toutes les corrections

// ========== SONS ==========
let clickSoundA = null, successSoundA = null, errorSoundA = null;
function loadSoundsA() {
    try {
        clickSoundA = new Audio('assets/sounds/click.mp3');
        successSoundA = new Audio('assets/sounds/success.mp3');
        errorSoundA = new Audio('assets/sounds/error.mp3');
        clickSoundA.load(); successSoundA.load(); errorSoundA.load();
        clickSoundA.volume = 0.6; successSoundA.volume = 0.5; errorSoundA.volume = 0.5;
    } catch(e) { console.log('Sons non disponibles'); }
}
function playSoundA(type) {
    try {
        if (type === 'click' && clickSoundA) { clickSoundA.currentTime = 0; clickSoundA.play().catch(e=>{}); }
        else if (type === 'success' && successSoundA) { successSoundA.currentTime = 0; successSoundA.play().catch(e=>{}); }
        else if (type === 'error' && errorSoundA) { errorSoundA.currentTime = 0; errorSoundA.play().catch(e=>{}); }
    } catch(e) {}
}
loadSoundsA();

function showToastA(message, type = 'info') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 400); }, 3000);
}

function formatNumberA(num) { if (num === undefined || num === null) return '0'; return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " "); }

function logoutA() { playSoundA('click'); sessionStorage.removeItem('user'); window.location.href = 'index.html'; }

// ========== TABLEAU DE BORD ==========
let agentFiltre = 'all';

async function loadAgentDashboard() {
    try {
        const user = JSON.parse(sessionStorage.getItem('user') || '{}');
        document.getElementById('agentName').textContent = user.nom || 'Agent';

        const today = new Date(); today.setHours(0,0,0,0);
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
        const snapshot = await db.collection('commandes').where('dateCreation','>=',today).where('dateCreation','<',tomorrow).get();

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

// ========== COMMANDES ==========
async function loadAgentCommandes() {
    try {
        const today = new Date(); today.setHours(0,0,0,0);
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
        let query = db.collection('commandes').where('dateCreation','>=',today).where('dateCreation','<',tomorrow).orderBy('dateCreation','desc');
        if (agentFiltre && agentFiltre !== 'all') query = query.where('statut','==',agentFiltre);
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
                <span class="montant">${formatNumberA(data.prixTotal||0)} FCFA</span>
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

// ========== MODALE NOUVELLE COMMANDE ==========
async function openCommandeModalAgent(commandeId) {
    playSoundA('click');
    resetCommandeFormAgent();
    await loadVendeursForSelectA('commandeVendeurSelectAgent');
    document.getElementById('commandeModalAgent').classList.add('active');
    if (commandeId) await loadCommandeForEditAgent(commandeId);
}

function closeCommandeModalAgent() {
    playSoundA('click');
    document.getElementById('commandeModalAgent').classList.remove('active');
    resetCommandeFormAgent();
}

function resetCommandeFormAgent() {
    document.getElementById('articlesContainerAgent').innerHTML = '';
    addArticleRowAgent();
    document.getElementById('commandeTelephoneAgent').value = '';
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

function switchModeAgent(mode) {
    document.getElementById('toggleSaisieAgent').classList.toggle('active', mode === 'saisie');
    document.getElementById('toggleCollageAgent').classList.toggle('active', mode === 'collage');
    document.getElementById('modeSaisieAgent').style.display = mode === 'saisie' ? 'block' : 'none';
    document.getElementById('modeCollageAgent').style.display = mode === 'collage' ? 'block' : 'none';
}

async function loadVendeursForSelectA(selectId) {
    try {
        const snapshot = await db.collection('vendeurs').orderBy('nom').get();
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">-- Sélectionnez --</option>';
        snapshot.forEach(doc => {
            const data = doc.data();
            const opt = document.createElement('option');
            opt.value = doc.id;
            opt.textContent = data.nom;
            select.appendChild(opt);
        });
    } catch(e) { console.error(e); }
}

function addArticleRowAgent() {
    playSoundA('click');
    const container = document.getElementById('articlesContainerAgent');
    const row = document.createElement('div');
    row.className = 'article-row';
    row.innerHTML = `<input type="number" class="article-qty" placeholder="Qté" min="1" value="1" /><input type="text" class="article-name" placeholder="Nom" />`;
    container.appendChild(row);
}

async function saveCommandeAgent() {
    const select = document.getElementById('commandeVendeurSelectAgent');
    const vendeurId = select.value;
    if (!vendeurId) { showToastA('⚠️ Sélectionnez un vendeur.', 'error'); return; }
    const vendeurNom = select.options[select.selectedIndex].textContent;
    const telephone = document.getElementById('commandeTelephoneAgent').value.trim();
    if (!telephone) { showToastA('⚠️ Téléphone client requis.', 'error'); return; }
    const rows = document.querySelectorAll('#articlesContainerAgent .article-row');
    const articles = [];
    rows.forEach(row => {
        const qty = row.querySelector('.article-qty').value;
        const name = row.querySelector('.article-name').value.trim();
        if (name) articles.push({ quantite: parseInt(qty)||1, nom: name });
    });
    if (articles.length === 0) { showToastA('⚠️ Ajoutez un article.', 'error'); return; }
    const prix = parseInt(document.getElementById('commandePrixAgent').value);
    if (isNaN(prix) || prix <= 0) { showToastA('⚠️ Prix valide requis.', 'error'); return; }
    const quartier = document.getElementById('commandeQuartierAgent').value.trim();
    const ville = document.getElementById('commandeVilleAgent').value.trim();
    if (!quartier || !ville) { showToastA('⚠️ Quartier et ville requis.', 'error'); return; }
    const zone = document.getElementById('commandeZoneAgent').value;
    const fraisInclus = document.getElementById('commandeFraisInclusAgent').checked;
    const note = document.getElementById('commandeNoteAgent').value.trim();
    const zones = { 'Libreville':2000, 'Akanda':3000, 'Owendo':3000, 'Bikélé':3000, 'Autres':4000 };
    const fraisLivraison = fraisInclus ? 0 : (zones[zone] || 0);
    const data = { articles, prixTotal: prix, fraisInclus, fraisLivraison, zone, quartier, ville, note, telephone, vendeurId, vendeur: vendeurNom, statut: 'À appeler', dateCreation: new Date() };
    try {
        const snapshot = await db.collection('commandes').get();
        const count = snapshot.size + 1;
        data.numero = `HDIX-${String(count).padStart(3, '0')}`;
        await db.collection('commandes').add(data);
        playSoundA('success');
        showToastA(`✅ Commande ${data.numero} enregistrée !`, 'success');
        closeCommandeModalAgent();
        loadAgentDashboard();
    } catch(e) { console.error(e); showToastA('❌ Erreur enregistrement.', 'error'); }
}

// ========== COLLAGE AVEC BOUTON COLLER ==========
function collerTexteAgent() {
    playSoundA('click');
    navigator.clipboard.readText().then(text => {
        document.getElementById('collageInputAgent').value = text;
        showToastA('✅ Texte collé ! Analyse automatique en cours...', 'success');
        setTimeout(analyserCollageAgent, 400);
    }).catch(() => {
        showToastA('⚠️ Collez manuellement (Ctrl+V).', 'error');
        document.getElementById('collageInputAgent').focus();
    });
}

function analyserCollageAgent() {
    const text = document.getElementById('collageInputAgent').value.trim();
    if (!text) { showToastA('⚠️ Collez un texte.', 'error'); return; }
    const result = analyserTexteAgent(text);
    if (result.articles.length === 0) { showToastA('⚠️ Aucun article détecté.', 'error'); return; }
    afficherConfirmationCollageAgent(result);
}

function afficherConfirmationCollageAgent(result) {
    const modal = document.getElementById('collageConfirmationModalAgent');
    const content = document.getElementById('collageConfirmationContentAgent');
    let articlesHtml = result.articles.map((a, idx) => `
        <div style="display:flex;gap:8px;margin-bottom:4px;">
            <input type="number" value="${a.quantite}" style="width:60px;padding:4px;border:1px solid #e2e8f0;border-radius:4px;" data-idx="${idx}" class="conf-qtyAgent" />
            <input type="text" value="${a.nom}" style="flex:1;padding:4px;border:1px solid #e2e8f0;border-radius:4px;" data-idx="${idx}" class="conf-nameAgent" />
        </div>
    `).join('');
    loadVendeursForSelectA('collageVendeurSelectAgent').then(() => {
        if (result.vendeur) {
            const select = document.getElementById('collageVendeurSelectAgent');
            for (let i = 0; i < select.options.length; i++) {
                if (select.options[i].textContent === result.vendeur) { select.value = select.options[i].value; break; }
            }
        }
    });
    content.innerHTML = `
        <div class="step-title">📋 CONFIRMER LA COMMANDE</div>
        <div class="step-subtitle">Vérifiez les informations détectées</div>
        <div class="vendeur-select-row"><label>Vendeur *</label><select id="collageVendeurSelectAgent"><option value="">-- Sélectionnez --</option></select></div>
        <div style="margin:12px 0;"><label>Articles</label><div id="collageArticlesContainerAgent">${articlesHtml}</div>
        <button onclick="ajouterLigneArticleCollageAgent()" class="add-article-btn" style="margin-top:6px;">+ Ajouter un article</button></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <div style="flex:1;"><label>💰 Prix total</label><input type="number" id="collagePrixAgent" value="${result.prix||''}" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:4px;" /></div>
            <div style="flex:1;"><label>🚚 Frais livraison</label><input type="number" id="collageFraisAgent" value="${result.frais||0}" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:4px;" /></div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;">
            <div style="flex:1;"><label>📍 Quartier</label><input type="text" id="collageQuartierAgent" value="${result.lieu ? result.lieu.split(',')[0].trim() : ''}" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:4px;" /></div>
            <div style="flex:1;"><label>Ville</label><input type="text" id="collageVilleAgent" value="${result.lieu && result.lieu.includes(',') ? result.lieu.split(',')[1].trim() : ''}" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:4px;" /></div>
        </div>
        <div style="margin-top:8px;"><label>📞 Téléphone client</label><input type="tel" id="collageTelephoneAgent" value="${result.telephone||''}" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:4px;" /></div>
        <div style="margin-top:8px;"><label>📝 Note</label><input type="text" id="collageNoteAgent" value="${result.note||''}" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:4px;" /></div>
        <div style="margin-top:12px;display:flex;gap:10px;">
            <button onclick="enregistrerCollageAgent()" class="btn-success" style="flex:1;padding:12px;">✅ Enregistrer</button>
            <button onclick="closeCollageConfirmationAgent()" class="btn-secondary" style="flex:1;padding:12px;">Annuler</button>
        </div>
    `;
    window._collageResultAgent = result;
    modal.classList.add('active');
}

function ajouterLigneArticleCollageAgent() {
    const container = document.getElementById('collageArticlesContainerAgent');
    const idx = container.querySelectorAll('.conf-qtyAgent').length;
    const div = document.createElement('div');
    div.style.display = 'flex'; div.style.gap = '8px'; div.style.marginBottom = '4px';
    div.innerHTML = `<input type="number" value="1" style="width:60px;padding:4px;border:1px solid #e2e8f0;border-radius:4px;" data-idx="${idx}" class="conf-qtyAgent" />
        <input type="text" value="" placeholder="Nom" style="flex:1;padding:4px;border:1px solid #e2e8f0;border-radius:4px;" data-idx="${idx}" class="conf-nameAgent" />`;
    container.appendChild(div);
}

async function enregistrerCollageAgent() {
    playSoundA('click');
    const vendeurSelect = document.getElementById('collageVendeurSelectAgent');
    const vendeurId = vendeurSelect.value;
    if (!vendeurId) { showToastA('⚠️ Sélectionnez un vendeur.', 'error'); return; }
    const vendeurNom = vendeurSelect.options[vendeurSelect.selectedIndex].textContent;
    const qtyInputs = document.querySelectorAll('.conf-qtyAgent');
    const nameInputs = document.querySelectorAll('.conf-nameAgent');
    const articles = [];
    for (let i=0; i<qtyInputs.length; i++) {
        const nom = nameInputs[i].value.trim();
        if (nom) articles.push({ quantite: parseInt(qtyInputs[i].value)||1, nom: nom });
    }
    if (articles.length === 0) { showToastA('⚠️ Ajoutez un article.', 'error'); return; }
    const prix = parseInt(document.getElementById('collagePrixAgent').value) || 0;
    if (prix <= 0) { showToastA('⚠️ Prix valide requis.', 'error'); return; }
    const telephone = document.getElementById('collageTelephoneAgent').value.trim();
    if (!telephone) { showToastA('⚠️ Téléphone client requis.', 'error'); return; }
    const quartier = document.getElementById('collageQuartierAgent').value.trim();
    const ville = document.getElementById('collageVilleAgent').value.trim();
    if (!quartier || !ville) { showToastA('⚠️ Quartier et ville requis.', 'error'); return; }
    const frais = parseInt(document.getElementById('collageFraisAgent').value) || 0;
    const note = document.getElementById('collageNoteAgent').value.trim();
    const data = { articles, prixTotal: prix, fraisLivraison: frais, zone: 'Non spécifiée', quartier, ville, note, telephone, vendeurId, vendeur: vendeurNom, statut: 'À appeler', dateCreation: new Date() };
    try {
        const snapshot = await db.collection('commandes').get();
        const count = snapshot.size + 1;
        data.numero = `HDIX-${String(count).padStart(3, '0')}`;
        await db.collection('commandes').add(data);
        playSoundA('success');
        showToastA(`✅ Commande ${data.numero} enregistrée !`, 'success');
        closeCollageConfirmationAgent(); closeCommandeModalAgent();
        loadAgentDashboard();
    } catch(e) { console.error(e); showToastA('❌ Erreur enregistrement.', 'error'); }
}

function closeCollageConfirmationAgent() { document.getElementById('collageConfirmationModalAgent').classList.remove('active'); }

function analyserTexteAgent(text) {
    const result = { articles: [], vendeur: '', prix: null, frais: 0, lieu: '', telephone: '', note: '' };
    const lines = text.split('\n').filter(l => l.trim());
    lines.forEach(line => {
        const trimmed = line.trim();
        const articleMatch = trimmed.match(/^(\d+)\s*[xX]?\s*(.+)$/);
        if (articleMatch) { result.articles.push({ quantite: parseInt(articleMatch[1]), nom: articleMatch[2].trim() }); return; }
        const prixMatch = trimmed.match(/(\d+[\s']?\d*)\s*F?CFA?/i);
        if (prixMatch && !result.prix) { result.prix = parseInt(prixMatch[1].replace(/\s/g, '')); return; }
        const fraisMatch = trimmed.match(/livraison\s*[:]?\s*(\d+[\s']?\d*)/i);
        if (fraisMatch) { result.frais = parseInt(fraisMatch[1].replace(/\s/g, '')); return; }
        if (trimmed.includes('ville')||trimmed.includes('quartier')||trimmed.includes('Libreville')||trimmed.includes('Akanda')||trimmed.includes('Owendo')) { result.lieu = trimmed; return; }
        if (trimmed.includes('vendeur')||trimmed.includes('Vendeur')) { result.vendeur = trimmed.replace(/vendeur\s*/i,'').trim(); return; }
        const phoneMatch = trimmed.match(/[\+]?[0-9]{8,15}/);
        if (phoneMatch && !result.telephone) { result.telephone = phoneMatch[0]; return; }
        if (trimmed.includes('note')||trimmed.includes('Note')) { result.note = trimmed.replace(/note\s*/i,'').trim(); return; }
    });
    if (!result.lieu) { for (const line of lines) { if (line.length > 3 && line.length < 50 && !result.lieu) { result.lieu = line.trim(); } } }
    return result;
}

// ========== APPELS AGENT ==========
let fileAppelA = [], indexAppelA = 0;

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
    const telephone = data.telephone || '';
    const statuts = ['À appeler', 'Validé', 'En-cours', 'Livrée', 'Indisponible', 'Va rappeler', 'Annulée', 'Refusée', 'Reportée'];
    let statutOptions = '';
    statuts.forEach(s => { const selected = data.statut === s ? 'selected' : ''; statutOptions += `<option value="${s}" ${selected}>${s}</option>`; });
    content.innerHTML = `
        <div class="step-title">📞 APPEL CLIENT</div>
        <div class="step-subtitle">Bon ${indexAppelA+1} sur ${fileAppelA.length}</div>
        <div class="recap-item"><span>Commande</span><span>${data.numero}</span></div>
        <div class="recap-item"><span>Vendeur</span><span>${data.vendeur}</span></div>
        <div class="recap-item"><span>Articles</span><span>${articles}</span></div>
        <div class="recap-item"><span>Lieu</span><span>${data.quartier}, ${data.ville}</span></div>
        <div class="recap-item"><span>Montant</span><span>${formatNumberA(data.prixTotal)} FCFA</span></div>
        <div class="recap-item"><span>📞 Téléphone</span><span><strong>${telephone || 'Non renseigné'}</strong></span></div>
        <div class="recap-item"><span>📌 Statut</span>
            <span><select id="appelStatutAgent" style="width:100%;padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;">${statutOptions}</select></span>
        </div>
        <div style="margin:16px 0;display:flex;gap:10px;flex-wrap:wrap;">
            ${telephone ? `<button onclick="appelerClientA('${item.id}')" class="btn-primary" style="flex:1;">📞 Appeler</button>` : ''}
            <button onclick="whatsappClientA('${item.id}')" class="btn-primary" style="flex:1;background:#25D366;">💬 WhatsApp</button>
        </div>
        <div style="margin:16px 0;display:flex;gap:10px;flex-wrap:wrap;">
            <button onclick="validerAppelA('${item.id}')" class="btn-success" style="flex:1;padding:12px;">✅ Valider</button>
            <button onclick="fermerAppelModalA()" class="btn-secondary" style="flex:1;padding:12px;">Fermer</button>
        </div>
        <p class="info-text">Le prochain bon apparaîtra automatiquement après validation.</p>`;
    modal.classList.add('active');
}

function fermerAppelModalA() { document.getElementById('appelModalAgent').classList.remove('active'); }
document.getElementById('appelModalAgent').addEventListener('click', function(e) { if (e.target === this) fermerAppelModalA(); });

async function validerAppelA(id) {
    const statut = document.getElementById('appelStatutAgent').value;
    try {
        await db.collection('commandes').doc(id).update({ statut: statut, dateAppel: new Date() });
        playSoundA('success');
        showToastA(`✅ Commande ${statut}`, 'success');
        indexAppelA++;
        afficherAppelA();
        loadAgentDashboard();
    } catch(e) { showToastA('❌ Erreur.', 'error'); }
}

function appelerClientA(id) {
    playSoundA('click');
    db.collection('commandes').doc(id).get().then(doc => {
        const data = doc.data();
        const phone = data.telephone || prompt('Numéro du client :');
        if (phone) { window.location.href = `tel:${phone.replace(/[^0-9+]/g, '')}`; }
        showToastA('📞 Appel en cours...', 'info');
    });
}

function whatsappClientA(id) {
    playSoundA('click');
    db.collection('commandes').doc(id).get().then(doc => {
        const data = doc.data();
        const phone = data.telephone || prompt('Numéro WhatsApp :');
        if (phone) { window.open(`https://wa.me/${phone.replace(/[^0-9+]/g,'').replace('+','')}?text=Bonjour, nous vous confirmons votre livraison (${data.numero}).`, '_blank'); }
    });
}

// ========== MODALE DÉTAIL ==========
async function afficherCommandeA(id) {
    playSoundA('click');
    try {
        const doc = await db.collection('commandes').doc(id).get();
        const data = doc.data();
        if (!data) { showToastA('⚠️ Commande non trouvée.', 'error'); return; }
        const modal = document.getElementById('detailCommandeModalAgent');
        const content = document.getElementById('detailCommandeContentAgent');
        let articlesHtml = '';
        if (data.articles && data.articles.length > 0) {
            data.articles.forEach((a, idx) => {
                articlesHtml += `
                    <div style="display:flex;gap:8px;margin-bottom:4px;">
                        <input type="number" value="${a.quantite}" style="width:60px;padding:4px;border:1px solid #e2e8f0;border-radius:4px;" data-idx="${idx}" class="edit-qtyA" />
                        <input type="text" value="${a.nom}" style="flex:1;padding:4px;border:1px solid #e2e8f0;border-radius:4px;" data-idx="${idx}" class="edit-nameA" />
                    </div>
                `;
            });
        } else { articlesHtml = '<span style="color:#6b7a8f;">Aucun article</span>'; }
        const statuts = ['À appeler', 'Validé', 'En-cours', 'Livrée', 'Indisponible', 'Va rappeler', 'Annulée', 'Refusée', 'Reportée'];
        let statutOptions = '';
        statuts.forEach(s => { const selected = data.statut === s ? 'selected' : ''; statutOptions += `<option value="${s}" ${selected}>${s}</option>`; });
        content.innerHTML = `
            <div class="step-title">📋 ${data.numero || 'N/A'}</div>
            <div style="margin-top:8px;">
                <div class="recap-item"><span>Vendeur</span><span><input type="text" id="editVendeurA" value="${data.vendeur||''}" style="width:100%;padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;" /></span></div>
                <div class="recap-item"><span>📞 Téléphone</span><span><input type="tel" id="editTelephoneA" value="${data.telephone||''}" style="width:100%;padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;" /></span></div>
                <div class="recap-item"><span>Articles</span></div>
                <div id="editArticlesContainerA" style="padding:4px 0 8px 16px;">${articlesHtml}</div>
                <button onclick="ajouterLigneArticleEditA()" class="add-article-btn" style="margin-top:4px;padding:6px;">+ Ajouter un article</button>
                <div class="recap-item"><span>💰 Montant</span><span><input type="number" id="editPrixA" value="${data.prixTotal||0}" style="width:100%;padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;" /></span></div>
                <div class="recap-item"><span>🚚 Frais livraison</span><span><input type="number" id="editFraisA" value="${data.fraisLivraison||0}" style="width:100%;padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;" /></span></div>
                <div class="recap-item"><span>📍 Lieu</span><span><input type="text" id="editQuartierA" value="${data.quartier||''}" placeholder="Quartier" style="width:48%;padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;" /><input type="text" id="editVilleA" value="${data.ville||''}" placeholder="Ville" style="width:48%;padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;" /></span></div>
                <div class="recap-item"><span>📌 Statut</span><span><select id="editStatutA" style="width:100%;padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;">${statutOptions}</select></span></div>
                ${data.note ? `<div class="recap-item"><span>📝 Note</span><span><input type="text" id="editNoteA" value="${data.note}" style="width:100%;padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;" /></span></div>` : ''}
                <div style="margin-top:12px;border-top:1px solid #e2e8f0;padding-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
                    <button onclick="enregistrerModificationsCommandeA('${id}')" class="btn-success" style="flex:1;padding:8px;">💾 Enregistrer</button>
                    ${data.telephone ? `<button onclick="appelerClientDepuisCommandeA('${data.telephone}')" class="btn-primary" style="flex:1;padding:8px;background:#25D366;">📞 Appeler</button>` : ''}
                    <button onclick="closeDetailCommandeModalAgent()" class="btn-secondary" style="flex:1;padding:8px;">Fermer</button>
                </div>
            </div>`;
        modal.classList.add('active');
    } catch(e) { console.error(e); showToastA('❌ Erreur affichage.', 'error'); }
}

function ajouterLigneArticleEditA() {
    const container = document.getElementById('editArticlesContainerA');
    const idx = container.querySelectorAll('.edit-qtyA').length;
    const div = document.createElement('div');
    div.style.display = 'flex'; div.style.gap = '8px'; div.style.marginBottom = '4px';
    div.innerHTML = `<input type="number" value="1" style="width:60px;padding:4px;border:1px solid #e2e8f0;border-radius:4px;" data-idx="${idx}" class="edit-qtyA" />
        <input type="text" value="" placeholder="Nom" style="flex:1;padding:4px;border:1px solid #e2e8f0;border-radius:4px;" data-idx="${idx}" class="edit-nameA" />`;
    container.appendChild(div);
}

async function enregistrerModificationsCommandeA(id) {
    playSoundA('click');
    try {
        const qtyInputs = document.querySelectorAll('.edit-qtyA');
        const nameInputs = document.querySelectorAll('.edit-nameA');
        const articles = [];
        for (let i=0; i<qtyInputs.length; i++) {
            const nom = nameInputs[i].value.trim();
            if (nom) articles.push({ quantite: parseInt(qtyInputs[i].value)||0, nom: nom });
        }
        const updateData = {
            vendeur: document.getElementById('editVendeurA').value.trim(),
            telephone: document.getElementById('editTelephoneA').value.trim(),
            articles: articles,
            prixTotal: parseInt(document.getElementById('editPrixA').value) || 0,
            fraisLivraison: parseInt(document.getElementById('editFraisA').value) || 0,
            quartier: document.getElementById('editQuartierA').value.trim(),
            ville: document.getElementById('editVilleA').value.trim(),
            statut: document.getElementById('editStatutA').value,
            note: document.getElementById('editNoteA')?.value.trim() || '',
            dateModification: new Date()
        };
        await db.collection('commandes').doc(id).update(updateData);
        playSoundA('success');
        showToastA('✅ Commande mise à jour !', 'success');
        closeDetailCommandeModalAgent();
        loadAgentDashboard();
    } catch(e) { console.error(e); showToastA('❌ Erreur mise à jour.', 'error'); }
}

function appelerClientDepuisCommandeA(telephone) {
    playSoundA('click');
    const phone = telephone.replace(/[^0-9+]/g, '');
    if (phone) { window.location.href = `tel:${phone}`; }
    else { showToastA('⚠️ Numéro invalide.', 'error'); }
}

function closeDetailCommandeModalAgent() { document.getElementById('detailCommandeModalAgent').classList.remove('active'); }

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
    row.innerHTML = `<input type="text" class="stock-article-name" placeholder="Nom" /><input type="number" class="stock-article-qty" placeholder="Qté" min="1" value="1" />`;
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
    if (articles.length === 0) { showToastA('⚠️ Ajoutez un article.', 'error'); return; }
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
        if (snapshot.empty) { container.innerHTML = '<p class="empty-message">Aucun stock.</p>'; return; }
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
        showToastA('✅ Stock retiré !', 'success');
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
    document.getElementById('detailCommandeModalAgent').addEventListener('click', function(e) {
        if (e.target === this) closeDetailCommandeModalAgent();
    });
    document.getElementById('collageConfirmationModalAgent').addEventListener('click', function(e) {
        if (e.target === this) closeCollageConfirmationAgent();
    });
});