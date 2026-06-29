// admin-script.js - Version simplifiée
// (seulement les fonctions essentielles pour la version "tableau blanc")

// ========== SONS ==========
let clickSound = null, successSound = null, errorSound = null;
function loadSounds() {
    try {
        clickSound = new Audio('assets/sounds/click.mp3');
        successSound = new Audio('assets/sounds/success.mp3');
        errorSound = new Audio('assets/sounds/error.mp3');
        clickSound.load(); successSound.load(); errorSound.load();
        clickSound.volume = 0.6; successSound.volume = 0.5; errorSound.volume = 0.5;
    } catch(e) { console.log('Sons non disponibles'); }
}
function playSound(type) {
    try {
        if (type === 'click' && clickSound) { clickSound.currentTime = 0; clickSound.play().catch(e=>{}); }
        else if (type === 'success' && successSound) { successSound.currentTime = 0; successSound.play().catch(e=>{}); }
        else if (type === 'error' && errorSound) { errorSound.currentTime = 0; errorSound.play().catch(e=>{}); }
    } catch(e) {}
}
loadSounds();

function showToast(message, type = 'info') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 400); }, 3000);
}

function formatNumber(num) { if (num === undefined || num === null) return '0'; return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " "); }

function showSpinner() { document.getElementById('globalSpinner').classList.add('active'); }
function hideSpinner() { document.getElementById('globalSpinner').classList.remove('active'); }

function logout() { playSound('click'); sessionStorage.removeItem('user'); window.location.href = 'index.html'; }

// ========== NAVIGATION SIMPLIFIÉE ==========
function showSection(section) {
    playSound('click');
    document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`section-${section}`).classList.add('active');
    document.querySelector(`.nav-btn[onclick="showSection('${section}')"]`).classList.add('active');
    
    if (section === 'commandes') { loadCommandes(); }
    if (section === 'stocks') { loadStockage(); }
    if (section === 'administration') { loadVendeurs(); loadAgents(); loadLivreurs(); loadInscriptions(); }
    if (section === 'bilan') { loadKPI(); loadVendeursForBilan(); loadTresorerie(); }
}

// ========== KPI ==========
async function loadKPI() {
    try {
        const today = new Date(); today.setHours(0,0,0,0);
        const snapshot = await db.collection('commandes').where('dateCreation', '>=', today).get();
        const vendeurs = await db.collection('vendeurs').get();
        const livreurs = await db.collection('livreurs').get();
        let total = 0, appeler = 0, livree = 0, ca = 0;
        snapshot.forEach(doc => { const data = doc.data(); total++; if (data.statut === 'À appeler') appeler++; if (data.statut === 'Livrée') livree++; ca += data.prixTotal || 0; });
        document.getElementById('kpiTotal').textContent = total;
        document.getElementById('kpiAppeler').textContent = appeler;
        document.getElementById('kpiLivree').textContent = livree;
        document.getElementById('kpiCA').textContent = formatNumber(ca);
        document.getElementById('kpiVendeurs').textContent = vendeurs.size;
        document.getElementById('kpiLivreurs').textContent = livreurs.size;
        const tx = total > 0 ? Math.round((livree/total)*100) : 0;
        document.getElementById('kpiTauxLivraison').textContent = tx + '%';
        const moy = livree > 0 ? Math.round(ca/livree) : 0;
        document.getElementById('kpiMoyenne').textContent = formatNumber(moy);
    } catch(e) { console.error(e); }
}

// ========== COMMANDES ==========
let filtreActif = 'all';
async function loadCommandes() {
    try {
        const today = new Date(); today.setHours(0,0,0,0);
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
        let query = db.collection('commandes').where('dateCreation','>=',today).where('dateCreation','<',tomorrow).orderBy('dateCreation','desc');
        if (filtreActif && filtreActif !== 'all') query = query.where('statut','==',filtreActif);
        const snapshot = await query.get();
        const container = document.getElementById('commandesContainer');
        if (snapshot.empty) { container.innerHTML = '<p class="empty-message">Aucune commande.</p>'; updateStats(0,0,0); return; }
        let html = '', appeler = 0, livree = 0, total = 0;
        snapshot.forEach(doc => {
            const data = doc.data();
            total++; if (data.statut === 'À appeler') appeler++; if (data.statut === 'Livrée') livree++;
            const sc = data.statut === 'Livrée' ? 'statut-livree' : data.statut === 'À appeler' ? 'statut-appel' : 'statut-attente';
            html += `<div class="commande-item" onclick="afficherCommande('${doc.id}')">
                <span class="numero">${data.numero||'N/A'}</span>
                <span class="localisation">📍 ${data.quartier||''}, ${data.ville||''}</span>
                <span class="vendeur">${data.vendeur||'N/A'}</span>
                <span class="montant">${formatNumber(data.prixTotal||0)} FCFA</span>
                <span class="statut ${sc}">${data.statut||'N/A'}</span>
                <span class="actions">
                    <button onclick="event.stopPropagation(); modifierCommande('${doc.id}')" title="Modifier">✏️</button>
                    <button onclick="event.stopPropagation(); supprimerCommande('${doc.id}')" title="Supprimer">🗑️</button>
                    <button onclick="event.stopPropagation(); afficherCommande('${doc.id}')" title="Voir">👁️</button>
                    ${data.statut !== 'Livrée' ? `<button onclick="event.stopPropagation(); assignerCommande('${doc.id}')">🚚</button>` : ''}
                </span>
            </div>`;
        });
        container.innerHTML = html;
        updateStats(appeler, livree, total);
    } catch(e) { console.error(e); }
}

function updateStats(appeler, livree, total) {
    document.getElementById('statAppeler').textContent = appeler;
    document.getElementById('statLivree').textContent = livree;
    document.getElementById('statTotal').textContent = total;
}

function filtrerCommandes(statut) {
    playSound('click');
    filtreActif = statut;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === statut));
    loadCommandes();
}

// ========== MODALE NOUVELLE COMMANDE ==========
async function openCommandeModal(commandeId) {
    playSound('click');
    resetCommandeForm();
    await loadVendeursForSelect('commandeVendeurSelect');
    document.getElementById('commandeModal').classList.add('active');
    if (commandeId) await loadCommandeForEdit(commandeId);
}

function closeCommandeModal() {
    playSound('click');
    document.getElementById('commandeModal').classList.remove('active');
    resetCommandeForm();
}

function resetCommandeForm() {
    document.getElementById('articlesContainer').innerHTML = '';
    addArticleRow();
    document.getElementById('commandeTelephone').value = '';
    document.getElementById('commandePrix').value = '';
    document.getElementById('commandeFraisInclus').checked = true;
    document.getElementById('commandeZone').value = '';
    document.getElementById('commandeQuartier').value = '';
    document.getElementById('commandeVille').value = '';
    document.getElementById('commandeNote').value = '';
    document.getElementById('collageInput').value = '';
    document.getElementById('collageResult').innerHTML = '';
    switchMode('saisie');
}

function switchMode(mode) {
    document.getElementById('toggleSaisie').classList.toggle('active', mode === 'saisie');
    document.getElementById('toggleCollage').classList.toggle('active', mode === 'collage');
    document.getElementById('modeSaisie').style.display = mode === 'saisie' ? 'block' : 'none';
    document.getElementById('modeCollage').style.display = mode === 'collage' ? 'block' : 'none';
}

async function loadVendeursForSelect(selectId) {
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

function addArticleRow() {
    playSound('click');
    const container = document.getElementById('articlesContainer');
    const row = document.createElement('div');
    row.className = 'article-row';
    row.innerHTML = `<input type="number" class="article-qty" placeholder="Qté" min="1" value="1" /><input type="text" class="article-name" placeholder="Nom" />`;
    container.appendChild(row);
}

async function saveCommande() {
    const select = document.getElementById('commandeVendeurSelect');
    const vendeurId = select.value;
    if (!vendeurId) { showToast('⚠️ Sélectionnez un vendeur.', 'error'); return; }
    const vendeurNom = select.options[select.selectedIndex].textContent;
    const telephone = document.getElementById('commandeTelephone').value.trim();
    if (!telephone) { showToast('⚠️ Téléphone client requis.', 'error'); return; }
    const rows = document.querySelectorAll('#articlesContainer .article-row');
    const articles = [];
    rows.forEach(row => {
        const qty = row.querySelector('.article-qty').value;
        const name = row.querySelector('.article-name').value.trim();
        if (name) articles.push({ quantite: parseInt(qty)||1, nom: name });
    });
    if (articles.length === 0) { showToast('⚠️ Ajoutez un article.', 'error'); return; }
    const prix = parseInt(document.getElementById('commandePrix').value);
    if (isNaN(prix) || prix <= 0) { showToast('⚠️ Prix valide requis.', 'error'); return; }
    const quartier = document.getElementById('commandeQuartier').value.trim();
    const ville = document.getElementById('commandeVille').value.trim();
    if (!quartier || !ville) { showToast('⚠️ Quartier et ville requis.', 'error'); return; }
    const zone = document.getElementById('commandeZone').value;
    const fraisInclus = document.getElementById('commandeFraisInclus').checked;
    const note = document.getElementById('commandeNote').value.trim();
    const zones = { 'Libreville':2000, 'Akanda':3000, 'Owendo':3000, 'Bikélé':3000, 'Autres':4000 };
    const fraisLivraison = fraisInclus ? 0 : (zones[zone] || 0);
    const data = { articles, prixTotal: prix, fraisInclus, fraisLivraison, zone, quartier, ville, note, telephone, vendeurId, vendeur: vendeurNom, statut: 'À appeler', dateCreation: new Date(), admin: 'Admin' };
    try {
        const snapshot = await db.collection('commandes').get();
        const count = snapshot.size + 1;
        data.numero = `HDIX-${String(count).padStart(3, '0')}`;
        await db.collection('commandes').add(data);
        playSound('success');
        showToast(`✅ Commande ${data.numero} enregistrée !`, 'success');
        closeCommandeModal();
        loadCommandes(); loadAppels(); loadKPI();
    } catch(e) { console.error(e); showToast('❌ Erreur enregistrement.', 'error'); }
}

// ========== COLLAGE ==========
function collerTexte() {
    playSound('click');
    navigator.clipboard.readText().then(text => {
        document.getElementById('collageInput').value = text;
        showToast('✅ Texte collé !', 'success');
        setTimeout(analyserCollage, 400);
    }).catch(() => {
        showToast('⚠️ Collez manuellement (Ctrl+V).', 'error');
        document.getElementById('collageInput').focus();
    });
}

function analyserCollage() {
    const text = document.getElementById('collageInput').value.trim();
    if (!text) { showToast('⚠️ Collez un texte.', 'error'); return; }
    const result = analyserTexte(text);
    if (result.articles.length === 0) { showToast('⚠️ Aucun article détecté.', 'error'); return; }
    afficherConfirmationCollage(result);
}

function analyserTexte(text) {
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

// ========== AUTRES FONCTIONS ESSENTIELLES ==========

// VENDEURS
async function loadVendeurs() {
    try {
        const snapshot = await db.collection('vendeurs').orderBy('nom').get();
        const container = document.getElementById('vendeursList');
        if (snapshot.empty) { container.innerHTML = '<p class="empty-message">Aucun vendeur.</p>'; return; }
        let html = '<div class="list-container">';
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const userSnap = await db.collection('users').where('vendeurId', '==', doc.id).get();
            let code = 'N/A';
            if (!userSnap.empty) { code = userSnap.docs[0].data().code_secret || 'N/A'; }
            html += `<div class="list-item"><div><strong>${data.nom}</strong><br><small>📞 ${data.telephone} | 🔑 ${code}</small></div>
                <div><button onclick="editVendeur('${doc.id}')" class="btn-edit">✏️</button>
                <button onclick="deleteVendeur('${doc.id}')" class="btn-delete">🗑️</button></div></div>`;
        }
        html += '</div>';
        container.innerHTML = html;
    } catch(e) { console.error(e); }
}

function openVendeurForm() {
    playSound('click');
    const nom = prompt('Nom du vendeur :'); if (!nom) return;
    const tel = prompt('Téléphone :'); if (!tel) return;
    const abr = prompt('Abréviation (ex: MODE) :'); if (!abr) return;
    let code = generateCodeSecret();
    db.collection('users').where('code_secret','==',code).get().then(s => {
        if (!s.empty) code = generateCodeSecret();
        return db.collection('vendeurs').add({ nom, telephone: tel, abreviation: abr.toUpperCase() });
    }).then(docRef => {
        return db.collection('users').add({ nom, role: 'vendeur', code_secret: code, telephone: tel, vendeurId: docRef.id, dateCreation: new Date() });
    }).then(() => {
        playSound('success');
        showToast(`✅ Vendeur ajouté ! Code: ${code}`, 'success');
        if (confirm(`Envoyer le code (${code}) par WhatsApp ?`)) {
            const phone = tel.replace('+','');
            window.open(`https://wa.me/${phone}?text=Bonjour ${nom}, votre code vendeur HDIX est: ${code}`, '_blank');
        }
        loadVendeurs(); loadKPI();
    }).catch(e => { console.error(e); showToast('❌ Erreur.', 'error'); });
}

// AGENTS
async function loadAgents() {
    try {
        const snapshot = await db.collection('users').where('role','==','agent').get();
        const container = document.getElementById('agentsList');
        if (snapshot.empty) { container.innerHTML = '<p class="empty-message">Aucun agent.</p>'; return; }
        const agents = []; snapshot.forEach(doc => { agents.push({ id: doc.id, ...doc.data() }); });
        agents.sort((a,b) => (a.nom||'').localeCompare(b.nom||''));
        let html = '<div class="list-container">';
        for (const data of agents) {
            html += `<div class="list-item"><div><strong>${data.nom}</strong><br><small>📞 ${data.telephone||'N/A'} | 🔑 ${data.code_secret||'N/A'}</small></div>
                <div><button onclick="editAgent('${data.id}')" class="btn-edit">✏️</button>
                <button onclick="deleteAgent('${data.id}')" class="btn-delete">🗑️</button></div></div>`;
        }
        html += '</div>';
        container.innerHTML = html;
    } catch(e) { console.error(e); }
}

function openAgentForm() {
    playSound('click');
    const nom = prompt('Nom de l\'agent :'); if (!nom) return;
    const tel = prompt('Téléphone :'); if (!tel) return;
    let code = generateCodeSecret();
    db.collection('users').add({ nom, role: 'agent', code_secret: code, telephone: tel, dateCreation: new Date() })
        .then(() => {
            playSound('success');
            showToast(`✅ Agent ajouté ! Code: ${code}`, 'success');
            if (confirm(`Envoyer le code (${code}) par WhatsApp ?`)) {
                const phone = tel.replace('+','');
                window.open(`https://wa.me/${phone}?text=Bonjour ${nom}, votre code agent HDIX est: ${code}`, '_blank');
            }
            loadAgents(); loadKPI();
        }).catch(e => { showToast('❌ Erreur.', 'error'); });
}

// LIVREURS
async function loadLivreurs() {
    try {
        const snapshot = await db.collection('livreurs').orderBy('nom').get();
        const container = document.getElementById('livreursList');
        if (snapshot.empty) { container.innerHTML = '<p class="empty-message">Aucun livreur.</p>'; return; }
        let html = '<div class="list-container">';
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const userSnap = await db.collection('users').where('livreurId','==',doc.id).get();
            let code = 'N/A';
            if (!userSnap.empty) { code = userSnap.docs[0].data().code_secret || 'N/A'; }
            html += `<div class="list-item"><div><strong>${data.nom}</strong><br><small>📞 ${data.telephone} | 🔑 ${code}</small></div>
                <div><button onclick="editLivreur('${doc.id}')" class="btn-edit">✏️</button>
                <button onclick="deleteLivreur('${doc.id}')" class="btn-delete">🗑️</button></div></div>`;
        }
        html += '</div>';
        container.innerHTML = html;
    } catch(e) { console.error(e); }
}

function openLivreurForm() {
    playSound('click');
    const nom = prompt('Nom du livreur :'); if (!nom) return;
    const tel = prompt('Téléphone :'); if (!tel) return;
    const zone = prompt('Zone :'); if (!zone) return;
    const cap = parseInt(prompt('Capacité :') || '10');
    const actif = confirm('Activer ?');
    let code = generateCodeSecret();
    db.collection('livreurs').add({ nom, telephone: tel, zone, capacite: cap||10, actif })
        .then(docRef => {
            return db.collection('users').add({ nom, role: 'livreur', code_secret: code, telephone: tel, livreurId: docRef.id, dateCreation: new Date() });
        })
        .then(() => {
            playSound('success');
            showToast(`✅ Livreur ajouté ! Code: ${code}`, 'success');
            if (confirm(`Envoyer le code (${code}) par WhatsApp ?`)) {
                const phone = tel.replace('+','');
                window.open(`https://wa.me/${phone}?text=Bonjour ${nom}, votre code livreur HDIX est: ${code}`, '_blank');
            }
            loadLivreurs(); loadKPI();
        }).catch(e => { showToast('❌ Erreur.', 'error'); });
}

// STOCKAGE
async function loadStockage() {
    try {
        const vendeurs = await db.collection('vendeurs').get();
        const container = document.getElementById('stockageList');
        const resume = document.getElementById('stockageResume');
        const dettes = document.getElementById('stockageDettes');
        if (vendeurs.empty) { container.innerHTML = '<p class="empty-message">Aucun vendeur.</p>'; return; }
        let html = '<div class="list-container">', totalCasiers=0, totalDettes=0;
        for (const doc of vendeurs.docs) {
            const data = doc.data();
            const s = await db.collection('stockage').where('vendeurId','==',doc.id).where('mois','==',new Date().getMonth()+1).where('annee','==',new Date().getFullYear()).get();
            let casiers=0, dette=0;
            if (!s.empty) { const d=s.docs[0].data(); casiers=d.casiers||0; dette=d.dette||0; }
            totalCasiers += casiers; totalDettes += dette;
            html += `<div class="list-item"><div><strong>${data.nom}</strong><br><small>Casiers: ${casiers} | Dette: ${formatNumber(dette)} FCFA</small></div>
                <div><button onclick="ajouterCasier('${doc.id}')" class="btn-edit">+</button>
                <button onclick="retirerCasier('${doc.id}')" class="btn-delete">-</button></div></div>`;
        }
        html += '</div>'; container.innerHTML = html;
        resume.innerHTML = `<div style="font-size:18px;font-weight:700;">${totalCasiers}</div><div style="color:#6b7a8f;">casiers</div>`;
        dettes.innerHTML = `<div style="font-size:18px;font-weight:700;color:${totalDettes>0?'#c0392b':'#2d7d46'};">${formatNumber(totalDettes)} FCFA</div><div style="color:#6b7a8f;">dette</div>`;
    } catch(e) { console.error(e); }
}

async function activerPrelevements() {
    playSound('click');
    if (!confirm('Activer les prélèvements pour tous les vendeurs ?')) return;
    try {
        const s = await db.collection('stockage').where('mois','==',new Date().getMonth()+1).where('annee','==',new Date().getFullYear()).get();
        let count=0;
        for(const doc of s.docs) { await db.collection('stockage').doc(doc.id).update({ prelevementsActifs: true, dateActivation: new Date() }); count++; }
        playSound('success');
        showToast(`✅ Prélèvements activés pour ${count} vendeur(s)`, 'success');
        loadStockage();
    } catch(e) { showToast('❌ Erreur.', 'error'); }
}

async function appliquerPenalites() {
    playSound('click');
    if (!confirm('Appliquer les pénalités de 2.500 FCFA/jour ?')) return;
    try {
        const s = await db.collection('stockage').where('mois','==',new Date().getMonth()+1).where('annee','==',new Date().getFullYear()).get();
        let count=0;
        for(const doc of s.docs) {
            const data=doc.data();
            if(data.dette>0) {
                await db.collection('stockage').doc(doc.id).update({ dette: (data.dette||0)+2500, penalites: (data.penalites||0)+2500, dernierJourRetard: new Date() });
                count++;
            }
        }
        playSound('success');
        showToast(`✅ Pénalités appliquées à ${count} vendeur(s)`, 'success');
        loadStockage();
    } catch(e) { showToast('❌ Erreur.', 'error'); }
}

// BILAN
async function generateBilan() {
    // ... (version simplifiée)
}

async function copyBilan() {
    // ... (version simplifiée)
}

// TRÉSORERIE
async function loadTresorerie() {
    // ... (version simplifiée)
}

// UTILITAIRES
function generateCodeSecret() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i=0; i<8; i++) code += chars.charAt(Math.floor(Math.random()*chars.length));
    return code;
}

async function generateUniqueCode() {
    let code = generateCodeSecret();
    let unique = false;
    let attempts=0;
    while(!unique && attempts<50) {
        const s = await db.collection('users').where('code_secret','==',code).get();
        if(s.empty) unique=true;
        else { code=generateCodeSecret(); attempts++; }
    }
    return code;
}

async function loadVendeursForBilan() {
    try {
        const s = await db.collection('commandes').get();
        const vendeurs = new Set();
        s.forEach(d => { const data=d.data(); if(data.vendeur) vendeurs.add(data.vendeur); });
        const select = document.getElementById('bilanVendeurSelect');
        select.innerHTML = '<option value="all">Tous les vendeurs</option>';
        vendeurs.forEach(v => { const opt=document.createElement('option'); opt.value=v; opt.textContent=v; select.appendChild(opt); });
    } catch(e) { console.error(e); }
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', function() {
    const user = sessionStorage.getItem('user');
    if (!user) { window.location.href = 'index.html'; return; }
    try {
        const u = JSON.parse(user);
        document.getElementById('adminName').textContent = u.nom || 'Admin';
        if (u.role !== 'admin') { window.location.href = 'index.html'; return; }
    } catch { window.location.href = 'index.html'; return; }
    
    // Charger la section par défaut
    showSection('commandes');
    
    // Fermer les modales
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) this.classList.remove('active');
        });
    });
});