// vendeur-script.js - Version complète avec toutes les corrections

// ========== SONS ==========
let clickSoundV = null, successSoundV = null, errorSoundV = null;
function loadSoundsV() {
    try {
        clickSoundV = new Audio('assets/sounds/click.mp3');
        successSoundV = new Audio('assets/sounds/success.mp3');
        errorSoundV = new Audio('assets/sounds/error.mp3');
        clickSoundV.load(); successSoundV.load(); errorSoundV.load();
        clickSoundV.volume = 0.6; successSoundV.volume = 0.5; errorSoundV.volume = 0.5;
    } catch(e) { console.log('Sons non disponibles'); }
}
function playSoundV(type) {
    try {
        if (type === 'click' && clickSoundV) { clickSoundV.currentTime = 0; clickSoundV.play().catch(e=>{}); }
        else if (type === 'success' && successSoundV) { successSoundV.currentTime = 0; successSoundV.play().catch(e=>{}); }
        else if (type === 'error' && errorSoundV) { errorSoundV.currentTime = 0; errorSoundV.play().catch(e=>{}); }
    } catch(e) {}
}
loadSoundsV();

function showToastV(message, type = 'info') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 400); }, 3000);
}

function formatNumberV(num) { if (num === undefined || num === null) return '0'; return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " "); }

function logoutV() { playSoundV('click'); sessionStorage.removeItem('user'); window.location.href = 'index.html'; }

// ========== DONNÉES ==========
let vendeurId = null;
let vendeurNom = '';
let vendeurFiltre = 'all';

// ========== CHARGEMENT ==========
async function loadVendeurData() {
    try {
        const user = JSON.parse(sessionStorage.getItem('user') || '{}');
        document.getElementById('vendeurName').textContent = user.nom || 'Vendeur';

        if (user.vendeurId) {
            const doc = await db.collection('vendeurs').doc(user.vendeurId).get();
            if (doc.exists) {
                vendeurId = doc.id;
                vendeurNom = doc.data().nom;
                loadVendeurCommandes();
                loadVendeurBilan();
                return;
            }
        }

        const snapshot = await db.collection('vendeurs').where('nom','==',user.nom).get();
        if (snapshot.empty) {
            document.getElementById('vendeurName').textContent = '⚠️ Vendeur non trouvé';
            return;
        }
        const doc = snapshot.docs[0];
        vendeurId = doc.id;
        vendeurNom = doc.data().nom;

        loadVendeurCommandes();
        loadVendeurBilan();
    } catch(e) { console.error(e); }
}

// ========== COMMANDES ==========
async function loadVendeurCommandes() {
    try {
        if (!vendeurId) return;
        const today = new Date(); today.setHours(0,0,0,0);
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
        let query = db.collection('commandes').where('vendeurId','==',vendeurId).where('dateCreation','>=',today).where('dateCreation','<',tomorrow).orderBy('dateCreation','desc');
        if (vendeurFiltre && vendeurFiltre !== 'all') query = query.where('statut','==',vendeurFiltre);
        const snapshot = await query.get();
        const container = document.getElementById('vendeurCommandesContainer');
        if (snapshot.empty) { container.innerHTML = '<p class="empty-message">Aucune commande aujourd\'hui.</p>'; return; }
        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const sc = data.statut === 'Livrée' ? 'statut-livree' : data.statut === 'À appeler' ? 'statut-appel' : 'statut-attente';
            html += `<div class="commande-item" onclick="afficherCommandeV('${doc.id}')">
                <span class="numero">${data.numero||'N/A'}</span>
                <span class="localisation">📍 ${data.quartier||''}, ${data.ville||''}</span>
                <span class="vendeur">${data.vendeur||'N/A'}</span>
                <span class="montant">${formatNumberV(data.prixTotal||0)} FCFA</span>
                <span class="statut ${sc}">${data.statut||'N/A'}</span>
                <span class="actions">
                    <button onclick="event.stopPropagation(); modifierCommandeV('${doc.id}')" title="Modifier">✏️</button>
                    <button onclick="event.stopPropagation(); supprimerCommandeV('${doc.id}')" title="Supprimer">🗑️</button>
                    <button onclick="event.stopPropagation(); afficherCommandeV('${doc.id}')" title="Voir">👁️</button>
                </span>
            </div>`;
        });
        container.innerHTML = html;
    } catch(e) { console.error(e); }
}

function filtrerVCommandes(statut) {
    playSoundV('click');
    vendeurFiltre = statut;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === statut));
    loadVendeurCommandes();
}

function voirToutesCommandesV() {
    playSoundV('click');
    vendeurFiltre = 'all';
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.filter-btn[data-filter="all"]')?.classList.add('active');
    loadVendeurCommandes();
}

// ========== MODALE NOUVELLE COMMANDE ==========
async function openCommandeModalV(commandeId) {
    playSoundV('click');
    resetCommandeFormV();
    document.getElementById('commandeModalV').classList.add('active');
    if (commandeId) await loadCommandeForEditV(commandeId);
}

function closeCommandeModalV() {
    playSoundV('click');
    document.getElementById('commandeModalV').classList.remove('active');
    resetCommandeFormV();
}

function resetCommandeFormV() {
    document.getElementById('articlesContainerV').innerHTML = '';
    addArticleRowV();
    document.getElementById('commandeTelephoneV').value = '';
    document.getElementById('commandePrixV').value = '';
    document.getElementById('commandeFraisInclusV').checked = true;
    document.getElementById('commandeZoneV').value = '';
    document.getElementById('commandeQuartierV').value = '';
    document.getElementById('commandeVilleV').value = '';
    document.getElementById('commandeNoteV').value = '';
    document.getElementById('collageInputV').value = '';
    document.getElementById('collageResultV').innerHTML = '';
    switchModeV('saisie');
}

function switchModeV(mode) {
    document.getElementById('toggleSaisieV').classList.toggle('active', mode === 'saisie');
    document.getElementById('toggleCollageV').classList.toggle('active', mode === 'collage');
    document.getElementById('modeSaisieV').style.display = mode === 'saisie' ? 'block' : 'none';
    document.getElementById('modeCollageV').style.display = mode === 'collage' ? 'block' : 'none';
}

function addArticleRowV() {
    playSoundV('click');
    const container = document.getElementById('articlesContainerV');
    const row = document.createElement('div');
    row.className = 'article-row';
    row.innerHTML = `<input type="number" class="article-qty" placeholder="Qté" min="1" value="1" /><input type="text" class="article-name" placeholder="Nom" />`;
    container.appendChild(row);
}

async function saveCommandeV() {
    const telephone = document.getElementById('commandeTelephoneV').value.trim();
    if (!telephone) { showToastV('⚠️ Téléphone client requis.', 'error'); return; }
    const rows = document.querySelectorAll('#articlesContainerV .article-row');
    const articles = [];
    rows.forEach(row => {
        const qty = row.querySelector('.article-qty').value;
        const name = row.querySelector('.article-name').value.trim();
        if (name) articles.push({ quantite: parseInt(qty)||1, nom: name });
    });
    if (articles.length === 0) { showToastV('⚠️ Ajoutez un article.', 'error'); return; }
    const prix = parseInt(document.getElementById('commandePrixV').value);
    if (isNaN(prix) || prix <= 0) { showToastV('⚠️ Prix valide requis.', 'error'); return; }
    const quartier = document.getElementById('commandeQuartierV').value.trim();
    const ville = document.getElementById('commandeVilleV').value.trim();
    if (!quartier || !ville) { showToastV('⚠️ Quartier et ville requis.', 'error'); return; }
    const zone = document.getElementById('commandeZoneV').value;
    const fraisInclus = document.getElementById('commandeFraisInclusV').checked;
    const note = document.getElementById('commandeNoteV').value.trim();
    const zones = { 'Libreville':2000, 'Akanda':3000, 'Owendo':3000, 'Bikélé':3000, 'Autres':4000 };
    const fraisLivraison = fraisInclus ? 0 : (zones[zone] || 0);
    const data = { articles, prixTotal: prix, fraisInclus, fraisLivraison, zone, quartier, ville, note, telephone, vendeurId, vendeur: vendeurNom, statut: 'À appeler', dateCreation: new Date() };
    try {
        const snapshot = await db.collection('commandes').get();
        const count = snapshot.size + 1;
        data.numero = `HDIX-${String(count).padStart(3, '0')}`;
        await db.collection('commandes').add(data);
        playSoundV('success');
        showToastV(`✅ Commande ${data.numero} enregistrée !`, 'success');
        closeCommandeModalV();
        loadVendeurCommandes();
        loadVendeurBilan();
    } catch(e) { console.error(e); showToastV('❌ Erreur enregistrement.', 'error'); }
}

// ========== COLLAGE ==========
function collerTexteV() {
    playSoundV('click');
    navigator.clipboard.readText().then(text => {
        document.getElementById('collageInputV').value = text;
        showToastV('✅ Texte collé ! Analyse automatique en cours...', 'success');
        setTimeout(analyserCollageV, 400);
    }).catch(() => {
        showToastV('⚠️ Collez manuellement (Ctrl+V).', 'error');
        document.getElementById('collageInputV').focus();
    });
}

function analyserCollageV() {
    const text = document.getElementById('collageInputV').value.trim();
    if (!text) { showToastV('⚠️ Collez un texte.', 'error'); return; }
    const result = analyserTexteV(text);
    if (result.articles.length === 0) { showToastV('⚠️ Aucun article détecté.', 'error'); return; }
    afficherConfirmationCollageV(result);
}

function afficherConfirmationCollageV(result) {
    const modal = document.getElementById('collageConfirmationModalV');
    const content = document.getElementById('collageConfirmationContentV');
    let articlesHtml = result.articles.map((a, idx) => `
        <div style="display:flex;gap:8px;margin-bottom:4px;">
            <input type="number" value="${a.quantite}" style="width:60px;padding:4px;border:1px solid #e2e8f0;border-radius:4px;" data-idx="${idx}" class="conf-qtyV" />
            <input type="text" value="${a.nom}" style="flex:1;padding:4px;border:1px solid #e2e8f0;border-radius:4px;" data-idx="${idx}" class="conf-nameV" />
        </div>
    `).join('');
    content.innerHTML = `
        <div class="step-title">📋 CONFIRMER LA COMMANDE</div>
        <div class="step-subtitle">Vérifiez les informations détectées</div>
        <div style="margin:12px 0;"><label>Articles</label><div id="collageArticlesContainerV">${articlesHtml}</div>
        <button onclick="ajouterLigneArticleCollageV()" class="add-article-btn" style="margin-top:6px;">+ Ajouter un article</button></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <div style="flex:1;"><label>💰 Prix total</label><input type="number" id="collagePrixV" value="${result.prix||''}" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:4px;" /></div>
            <div style="flex:1;"><label>🚚 Frais livraison</label><input type="number" id="collageFraisV" value="${result.frais||0}" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:4px;" /></div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;">
            <div style="flex:1;"><label>📍 Quartier</label><input type="text" id="collageQuartierV" value="${result.lieu ? result.lieu.split(',')[0].trim() : ''}" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:4px;" /></div>
            <div style="flex:1;"><label>Ville</label><input type="text" id="collageVilleV" value="${result.lieu && result.lieu.includes(',') ? result.lieu.split(',')[1].trim() : ''}" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:4px;" /></div>
        </div>
        <div style="margin-top:8px;"><label>📞 Téléphone client</label><input type="tel" id="collageTelephoneV" value="${result.telephone||''}" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:4px;" /></div>
        <div style="margin-top:8px;"><label>📝 Note</label><input type="text" id="collageNoteV" value="${result.note||''}" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:4px;" /></div>
        <div style="margin-top:12px;display:flex;gap:10px;">
            <button onclick="enregistrerCollageV()" class="btn-success" style="flex:1;padding:12px;">✅ Enregistrer</button>
            <button onclick="closeCollageConfirmationV()" class="btn-secondary" style="flex:1;padding:12px;">Annuler</button>
        </div>
    `;
    window._collageResultV = result;
    modal.classList.add('active');
}

function ajouterLigneArticleCollageV() {
    const container = document.getElementById('collageArticlesContainerV');
    const idx = container.querySelectorAll('.conf-qtyV').length;
    const div = document.createElement('div');
    div.style.display = 'flex'; div.style.gap = '8px'; div.style.marginBottom = '4px';
    div.innerHTML = `<input type="number" value="1" style="width:60px;padding:4px;border:1px solid #e2e8f0;border-radius:4px;" data-idx="${idx}" class="conf-qtyV" />
        <input type="text" value="" placeholder="Nom" style="flex:1;padding:4px;border:1px solid #e2e8f0;border-radius:4px;" data-idx="${idx}" class="conf-nameV" />`;
    container.appendChild(div);
}

async function enregistrerCollageV() {
    playSoundV('click');
    const qtyInputs = document.querySelectorAll('.conf-qtyV');
    const nameInputs = document.querySelectorAll('.conf-nameV');
    const articles = [];
    for (let i=0; i<qtyInputs.length; i++) {
        const nom = nameInputs[i].value.trim();
        if (nom) articles.push({ quantite: parseInt(qtyInputs[i].value)||1, nom: nom });
    }
    if (articles.length === 0) { showToastV('⚠️ Ajoutez un article.', 'error'); return; }
    const prix = parseInt(document.getElementById('collagePrixV').value) || 0;
    if (prix <= 0) { showToastV('⚠️ Prix valide requis.', 'error'); return; }
    const telephone = document.getElementById('collageTelephoneV').value.trim();
    if (!telephone) { showToastV('⚠️ Téléphone client requis.', 'error'); return; }
    const quartier = document.getElementById('collageQuartierV').value.trim();
    const ville = document.getElementById('collageVilleV').value.trim();
    if (!quartier || !ville) { showToastV('⚠️ Quartier et ville requis.', 'error'); return; }
    const frais = parseInt(document.getElementById('collageFraisV').value) || 0;
    const note = document.getElementById('collageNoteV').value.trim();
    const data = { articles, prixTotal: prix, fraisLivraison: frais, zone: 'Non spécifiée', quartier, ville, note, telephone, vendeurId, vendeur: vendeurNom, statut: 'À appeler', dateCreation: new Date() };
    try {
        const snapshot = await db.collection('commandes').get();
        const count = snapshot.size + 1;
        data.numero = `HDIX-${String(count).padStart(3, '0')}`;
        await db.collection('commandes').add(data);
        playSoundV('success');
        showToastV(`✅ Commande ${data.numero} enregistrée !`, 'success');
        closeCollageConfirmationV(); closeCommandeModalV();
        loadVendeurCommandes();
        loadVendeurBilan();
    } catch(e) { console.error(e); showToastV('❌ Erreur enregistrement.', 'error'); }
}

function closeCollageConfirmationV() { document.getElementById('collageConfirmationModalV').classList.remove('active'); }

function analyserTexteV(text) {
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

// ========== MODALE DÉTAIL ==========
async function afficherCommandeV(id) {
    playSoundV('click');
    try {
        const doc = await db.collection('commandes').doc(id).get();
        const data = doc.data();
        if (!data) { showToastV('⚠️ Commande non trouvée.', 'error'); return; }
        const modal = document.getElementById('detailCommandeModalV');
        const content = document.getElementById('detailCommandeContentV');
        let articlesHtml = '';
        if (data.articles && data.articles.length > 0) {
            data.articles.forEach((a, idx) => {
                articlesHtml += `
                    <div style="display:flex;gap:8px;margin-bottom:4px;">
                        <input type="number" value="${a.quantite}" style="width:60px;padding:4px;border:1px solid #e2e8f0;border-radius:4px;" data-idx="${idx}" class="edit-qtyV" />
                        <input type="text" value="${a.nom}" style="flex:1;padding:4px;border:1px solid #e2e8f0;border-radius:4px;" data-idx="${idx}" class="edit-nameV" />
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
                <div class="recap-item"><span>Vendeur</span><span><input type="text" id="editVendeurV" value="${data.vendeur||''}" style="width:100%;padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;" /></span></div>
                <div class="recap-item"><span>📞 Téléphone</span><span><input type="tel" id="editTelephoneV" value="${data.telephone||''}" style="width:100%;padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;" /></span></div>
                <div class="recap-item"><span>Articles</span></div>
                <div id="editArticlesContainerV" style="padding:4px 0 8px 16px;">${articlesHtml}</div>
                <button onclick="ajouterLigneArticleEditV()" class="add-article-btn" style="margin-top:4px;padding:6px;">+ Ajouter un article</button>
                <div class="recap-item"><span>💰 Montant</span><span><input type="number" id="editPrixV" value="${data.prixTotal||0}" style="width:100%;padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;" /></span></div>
                <div class="recap-item"><span>🚚 Frais livraison</span><span><input type="number" id="editFraisV" value="${data.fraisLivraison||0}" style="width:100%;padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;" /></span></div>
                <div class="recap-item"><span>📍 Lieu</span><span><input type="text" id="editQuartierV" value="${data.quartier||''}" placeholder="Quartier" style="width:48%;padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;" /><input type="text" id="editVilleV" value="${data.ville||''}" placeholder="Ville" style="width:48%;padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;" /></span></div>
                <div class="recap-item"><span>📌 Statut</span><span><select id="editStatutV" style="width:100%;padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;">${statutOptions}</select></span></div>
                ${data.note ? `<div class="recap-item"><span>📝 Note</span><span><input type="text" id="editNoteV" value="${data.note}" style="width:100%;padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;" /></span></div>` : ''}
                <div style="margin-top:12px;border-top:1px solid #e2e8f0;padding-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
                    <button onclick="enregistrerModificationsCommandeV('${id}')" class="btn-success" style="flex:1;padding:8px;">💾 Enregistrer</button>
                    ${data.telephone ? `<button onclick="appelerClientDepuisCommandeV('${data.telephone}')" class="btn-primary" style="flex:1;padding:8px;background:#25D366;">📞 Appeler</button>` : ''}
                    <button onclick="closeDetailCommandeModalV()" class="btn-secondary" style="flex:1;padding:8px;">Fermer</button>
                </div>
            </div>`;
        modal.classList.add('active');
    } catch(e) { console.error(e); showToastV('❌ Erreur affichage.', 'error'); }
}

function ajouterLigneArticleEditV() {
    const container = document.getElementById('editArticlesContainerV');
    const idx = container.querySelectorAll('.edit-qtyV').length;
    const div = document.createElement('div');
    div.style.display = 'flex'; div.style.gap = '8px'; div.style.marginBottom = '4px';
    div.innerHTML = `<input type="number" value="1" style="width:60px;padding:4px;border:1px solid #e2e8f0;border-radius:4px;" data-idx="${idx}" class="edit-qtyV" />
        <input type="text" value="" placeholder="Nom" style="flex:1;padding:4px;border:1px solid #e2e8f0;border-radius:4px;" data-idx="${idx}" class="edit-nameV" />`;
    container.appendChild(div);
}

async function enregistrerModificationsCommandeV(id) {
    playSoundV('click');
    try {
        const qtyInputs = document.querySelectorAll('.edit-qtyV');
        const nameInputs = document.querySelectorAll('.edit-nameV');
        const articles = [];
        for (let i=0; i<qtyInputs.length; i++) {
            const nom = nameInputs[i].value.trim();
            if (nom) articles.push({ quantite: parseInt(qtyInputs[i].value)||0, nom: nom });
        }
        const updateData = {
            vendeur: document.getElementById('editVendeurV').value.trim(),
            telephone: document.getElementById('editTelephoneV').value.trim(),
            articles: articles,
            prixTotal: parseInt(document.getElementById('editPrixV').value) || 0,
            fraisLivraison: parseInt(document.getElementById('editFraisV').value) || 0,
            quartier: document.getElementById('editQuartierV').value.trim(),
            ville: document.getElementById('editVilleV').value.trim(),
            statut: document.getElementById('editStatutV').value,
            note: document.getElementById('editNoteV')?.value.trim() || '',
            dateModification: new Date()
        };
        await db.collection('commandes').doc(id).update(updateData);
        playSoundV('success');
        showToastV('✅ Commande mise à jour !', 'success');
        closeDetailCommandeModalV();
        loadVendeurCommandes();
        loadVendeurBilan();
    } catch(e) { console.error(e); showToastV('❌ Erreur mise à jour.', 'error'); }
}

function appelerClientDepuisCommandeV(telephone) {
    playSoundV('click');
    const phone = telephone.replace(/[^0-9+]/g, '');
    if (phone) { window.location.href = `tel:${phone}`; }
    else { showToastV('⚠️ Numéro invalide.', 'error'); }
}

function closeDetailCommandeModalV() { document.getElementById('detailCommandeModalV').classList.remove('active'); }

// ========== BILAN ==========
async function loadVendeurBilan() {
    try {
        if (!vendeurId) return;
        const today = new Date(); today.setHours(0,0,0,0);
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
        const snapshot = await db.collection('commandes').where('vendeurId','==',vendeurId).where('dateCreation','>=',today).where('dateCreation','<',tomorrow).get();

        let stats = { 'Livrée':0, 'Indisponible':0, 'En-cours':0, 'Va rappeler':0, 'Annulée':0, 'Refusée':0, 'Reportée':0 };
        let totalVentes = 0, totalFrais = 0;
        snapshot.forEach(doc => {
            const data = doc.data();
            if (stats[data.statut] !== undefined) stats[data.statut]++;
            totalVentes += data.prixTotal || 0;
            totalFrais += data.fraisLivraison || 0;
        });

        document.getElementById('bLivree').textContent = stats['Livrée'];
        document.getElementById('bIndisponible').textContent = stats['Indisponible'];
        document.getElementById('bEncours').textContent = stats['En-cours'];
        document.getElementById('bVaRappeler').textContent = stats['Va rappeler'];
        document.getElementById('bAnnulee').textContent = stats['Annulée'];
        document.getElementById('bRefusee').textContent = stats['Refusée'];
        document.getElementById('bReportee').textContent = stats['Reportée'];
        document.getElementById('bMontant').textContent = formatNumberV(totalVentes);
        document.getElementById('bLivraison').textContent = formatNumberV(totalFrais);
        document.getElementById('bAEnvoyer').textContent = formatNumberV(totalVentes - totalFrais);
    } catch(e) { console.error(e); }
}

async function copyBilanV() {
    playSoundV('click');
    try {
        if (!vendeurId) return;
        const today = new Date(); today.setHours(0,0,0,0);
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
        const snapshot = await db.collection('commandes').where('vendeurId','==',vendeurId).where('dateCreation','>=',today).where('dateCreation','<',tomorrow).get();

        let stats = { 'Livrée':0, 'Indisponible':0, 'En-cours':0, 'Va rappeler':0, 'Annulée':0, 'Refusée':0, 'Reportée':0 };
        let totalVentes = 0, totalFrais = 0, details = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (stats[data.statut] !== undefined) stats[data.statut]++;
            totalVentes += data.prixTotal || 0;
            totalFrais += data.fraisLivraison || 0;
            details.push(`${data.numero} : ${formatNumberV(data.prixTotal)} FCFA - ${data.statut}`);
        });
        const dateStr = today.toLocaleDateString('fr-FR');
        let text = `📊 BILAN DU ${dateStr}\n\n`;
        text += `🔴 Livrée : ${stats['Livrée']}\n🔴 Indisponible : ${stats['Indisponible']}\n🔴 En-cours : ${stats['En-cours']}\n`;
        text += `🔴 Va rappeler : ${stats['Va rappeler']}\n🔴 Annulée : ${stats['Annulée']}\n🔴 Refusée : ${stats['Refusée']}\n🔴 Reportée : ${stats['Reportée']}\n\n`;
        text += `💰 Montant : ${formatNumberV(totalVentes)} FCFA\n🚚 Livraison : ${formatNumberV(totalFrais)} FCFA\n📤 À envoyer : ${formatNumberV(totalVentes - totalFrais)} FCFA\n\n📦 Détail :\n${details.join('\n')}`;
        await navigator.clipboard.writeText(text);
        playSoundV('success');
        showToastV('✅ Bilan copié !', 'success');
    } catch(e) { showToastV('❌ Erreur copie.', 'error'); }
}

// ========== STOCK ==========
async function voirStockV() {
    playSoundV('click');
    document.getElementById('stockModalV').classList.add('active');
    await rafraichirStockV();
}

function closeStockModalV() { document.getElementById('stockModalV').classList.remove('active'); }

async function rafraichirStockV() {
    try {
        if (!vendeurId) return;
        const snapshot = await db.collection('stock').where('vendeurId','==',vendeurId).get();
        const container = document.getElementById('stockListContainerV');
        if (snapshot.empty) { container.innerHTML = '<p class="empty-message">Aucun stock enregistré.</p>'; return; }
        let html = '<div class="list-container">';
        let total = 0;
        snapshot.forEach(doc => {
            const data = doc.data();
            total += data.quantite || 0;
            html += `<div class="list-item"><div><strong>${data.nom}</strong><br><small>${data.quantite||0} unités</small></div></div>`;
        });
        html += `<div style="padding:12px 0;border-top:2px solid #e2e8f0;font-weight:700;">📊 Total : ${total} unités</div>`;
        html += '</div>';
        container.innerHTML = html;
    } catch(e) { console.error(e); }
}

// ========== COMMANDES CRUD ==========
async function modifierCommandeV(id) {
    playSoundV('click');
    await openCommandeModalV(id);
}

async function supprimerCommandeV(id) {
    playSoundV('click');
    if (!confirm('⚠️ Supprimer définitivement cette commande ?')) return;
    try {
        await db.collection('commandes').doc(id).delete();
        playSoundV('success');
        showToastV('🗑️ Commande supprimée.', 'success');
        loadVendeurCommandes();
        loadVendeurBilan();
    } catch(e) { showToastV('❌ Erreur suppression.', 'error'); }
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', function() {
    const user = sessionStorage.getItem('user');
    if (!user) { window.location.href = 'index.html'; return; }
    try {
        const u = JSON.parse(user);
        if (u.role !== 'vendeur') { window.location.href = 'index.html'; return; }
    } catch { window.location.href = 'index.html'; return; }
    loadVendeurData();

    document.getElementById('commandeModalV').addEventListener('click', function(e) {
        if (e.target === this) closeCommandeModalV();
    });
    document.getElementById('stockModalV').addEventListener('click', function(e) {
        if (e.target === this) closeStockModalV();
    });
    document.getElementById('detailCommandeModalV').addEventListener('click', function(e) {
        if (e.target === this) closeDetailCommandeModalV();
    });
    document.getElementById('collageConfirmationModalV').addEventListener('click', function(e) {
        if (e.target === this) closeCollageConfirmationV();
    });
});