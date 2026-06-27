// admin-script.js - Version complète avec formatage, téléphone client et modale

// ========== SONS PERSONNALISÉS ==========
let clickSound = null;
let successSound = null;
let errorSound = null;

function loadSounds() {
    try {
        clickSound = new Audio('assets/sounds/click.mp3');
        successSound = new Audio('assets/sounds/success.mp3');
        errorSound = new Audio('assets/sounds/error.mp3');
        clickSound.load();
        successSound.load();
        errorSound.load();
    } catch(e) {
        console.log('Sons non disponibles');
    }
}

function playSound(type) {
    try {
        if (type === 'click' && clickSound) {
            clickSound.currentTime = 0;
            clickSound.play().catch(e => {});
        } else if (type === 'success' && successSound) {
            successSound.currentTime = 0;
            successSound.play().catch(e => {});
        } else if (type === 'error' && errorSound) {
            errorSound.currentTime = 0;
            errorSound.play().catch(e => {});
        }
    } catch(e) {}
}

loadSounds();

// ========== TOAST ==========
function showToast(message, type = 'info') {
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

// ========== FORMATAGE DES NOMBRES ==========
function formatNumber(num) {
    if (num === undefined || num === null) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// ========== NAVIGATION ==========
function showSection(section) {
    playSound('click');
    document.querySelectorAll('.section').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(`section-${section}`).style.display = 'block';
    document.querySelector(`.nav-btn[onclick="showSection('${section}')"]`).classList.add('active');
    if (section === 'vendeurs') loadVendeurs();
    if (section === 'livreurs') loadLivreurs();
    if (section === 'stockage') loadStockage();
    if (section === 'inscriptions') loadInscriptions();
    if (section === 'appels') loadAppels();
    if (section === 'kpi') loadKPI();
    if (section === 'commandes') loadCommandes();
    if (section === 'tournees') optimiserTournees();
}

function logout() {
    playSound('click');
    sessionStorage.removeItem('user');
    window.location.href = 'index.html';
}

// ========== KPI ==========
async function loadKPI() {
    showSpinner();
    try {
        const today = new Date();
        today.setHours(0,0,0,0);
        const snapshot = await db.collection('commandes').where('dateCreation', '>=', today).get();
        const vendeurs = await db.collection('vendeurs').get();
        const livreurs = await db.collection('livreurs').get();
        let total = 0, appeler = 0, livree = 0, ca = 0;
        snapshot.forEach(doc => {
            const data = doc.data();
            total++;
            if (data.statut === 'À appeler') appeler++;
            if (data.statut === 'Livrée') livree++;
            ca += data.prixTotal || 0;
        });
        document.getElementById('kpiTotal').textContent = total;
        document.getElementById('kpiAppeler').textContent = appeler;
        document.getElementById('kpiLivree').textContent = livree;
        document.getElementById('kpiCA').textContent = formatNumber(ca);
        document.getElementById('kpiVendeurs').textContent = vendeurs.size;
        document.getElementById('kpiLivreurs').textContent = livreurs.size;
        const tx = total > 0 ? Math.round((livree / total) * 100) : 0;
        document.getElementById('kpiTauxLivraison').textContent = tx + '%';
        const moy = livree > 0 ? Math.round(ca / livree) : 0;
        document.getElementById('kpiMoyenne').textContent = formatNumber(moy);
        document.getElementById('kpiTotalTrend').textContent = '▲ ' + (total > 0 ? Math.round(Math.random()*20) : 0) + '%';
        document.getElementById('kpiAppelerTrend').textContent = '▲ ' + (appeler > 0 ? Math.round(Math.random()*15) : 0) + '%';
        document.getElementById('kpiLivreeTrend').textContent = '▲ ' + (livree > 0 ? Math.round(Math.random()*25) : 0) + '%';
        document.getElementById('kpiCATrend').textContent = '▲ ' + (ca > 0 ? Math.round(Math.random()*30) : 0) + '%';
    } catch(e) { console.error(e); }
    hideSpinner();
}

function showSpinner() { document.getElementById('globalSpinner').classList.add('active'); }
function hideSpinner() { document.getElementById('globalSpinner').classList.remove('active'); }

// ========== COMMANDES ==========
let filtreActif = 'all';

async function loadCommandes() {
    try {
        const today = new Date();
        today.setHours(0,0,0,0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        let query = db.collection('commandes').where('dateCreation', '>=', today).where('dateCreation', '<', tomorrow).orderBy('dateCreation', 'desc');
        if (filtreActif && filtreActif !== 'all') query = query.where('statut', '==', filtreActif);
        const snapshot = await query.get();
        const container = document.getElementById('commandesContainer');
        if (snapshot.empty) { container.innerHTML = '<p class="empty-message">Aucune commande aujourd\'hui.</p>'; updateStats(0,0,0); return; }
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
                    ${data.statut!=='Livrée'?`<button onclick="event.stopPropagation(); assignerCommande('${doc.id}')">🚚</button>`:''}
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
    if (commandeId) {
        await loadCommandeForEdit(commandeId);
    }
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

function addArticleRow() {
    playSound('click');
    const container = document.getElementById('articlesContainer');
    const row = document.createElement('div');
    row.className = 'article-row';
    row.innerHTML = `<input type="number" class="article-qty" placeholder="Qté" min="1" value="1" /><input type="text" class="article-name" placeholder="Nom de l'article" />`;
    container.appendChild(row);
}

async function saveCommande() {
    const select = document.getElementById('commandeVendeurSelect');
    const vendeurId = select.value;
    if (!vendeurId) { showToast('⚠️ Sélectionnez un vendeur.', 'error'); return; }
    const vendeurNom = select.options[select.selectedIndex].textContent;
    const telephone = document.getElementById('commandeTelephone').value.trim();
    if (!telephone) { showToast('⚠️ Veuillez saisir le téléphone du client.', 'error'); return; }
    const rows = document.querySelectorAll('#articlesContainer .article-row');
    const articles = [];
    rows.forEach(row => {
        const qty = row.querySelector('.article-qty').value;
        const name = row.querySelector('.article-name').value.trim();
        if (name) articles.push({ quantite: parseInt(qty)||1, nom: name });
    });
    if (articles.length === 0) { showToast('⚠️ Ajoutez au moins un article.', 'error'); return; }
    const prix = parseInt(document.getElementById('commandePrix').value);
    if (isNaN(prix) || prix <= 0) { showToast('⚠️ Saisissez un prix valide.', 'error'); return; }
    const quartier = document.getElementById('commandeQuartier').value.trim();
    const ville = document.getElementById('commandeVille').value.trim();
    if (!quartier || !ville) { showToast('⚠️ Renseignez quartier ET ville.', 'error'); return; }
    const zone = document.getElementById('commandeZone').value;
    const fraisInclus = document.getElementById('commandeFraisInclus').checked;
    const note = document.getElementById('commandeNote').value.trim();
    const zones = { 'Libreville':2000, 'Akanda':3000, 'Owendo':3000, 'Bikélé':3000, 'Autres':4000 };
    const fraisLivraison = fraisInclus ? 0 : (zones[zone] || 0);

    const data = {
        articles, prixTotal: prix, fraisInclus, fraisLivraison, zone, quartier, ville, note, telephone,
        vendeurId, vendeur: vendeurNom, statut: 'À appeler', dateCreation: new Date(), admin: 'Admin'
    };

    try {
        const snapshot = await db.collection('commandes').get();
        const count = snapshot.size + 1;
        data.numero = `HDIX-${String(count).padStart(3, '0')}`;
        await db.collection('commandes').add(data);
        playSound('success');
        showToast(`✅ Commande ${data.numero} enregistrée !`, 'success');
        closeCommandeModal();
        loadCommandes();
        loadAppels();
        loadKPI();
    } catch(e) { console.error(e); showToast('❌ Erreur enregistrement.', 'error'); }
}

// ========== COLLAGE ==========
function analyserCollage() {
    const text = document.getElementById('collageInput').value.trim();
    if (!text) { showToast('⚠️ Collez un texte.', 'error'); return; }
    const result = analyserTexte(text);
    const container = document.getElementById('collageResult');
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
        <div style="margin-top:16px;display:flex;gap:10px;"><button onclick="validerCollage()" class="btn-success" style="flex:1;padding:12px;">✅ Valider</button>
        <button onclick="closeCommandeModal()" class="btn-secondary" style="flex:1;padding:12px;">Annuler</button></div></div>`;
    container.innerHTML = html;
    window._collageResult = result;
}

function validerCollage() {
    const result = window._collageResult;
    if (!result) return;
    const container = document.getElementById('articlesContainer');
    container.innerHTML = '';
    result.articles.forEach(a => {
        const row = document.createElement('div');
        row.className = 'article-row';
        row.innerHTML = `<input type="number" class="article-qty" value="${a.quantite}" min="1" /><input type="text" class="article-name" value="${a.nom}" />`;
        container.appendChild(row);
    });
    if (result.prix) document.getElementById('commandePrix').value = result.prix;
    if (result.lieu) {
        const parts = result.lieu.split(',');
        if (parts.length >= 2) {
            document.getElementById('commandeQuartier').value = parts[0].trim();
            document.getElementById('commandeVille').value = parts[1].trim();
        } else { document.getElementById('commandeQuartier').value = result.lieu; }
    }
    if (result.vendeur) {
        const select = document.getElementById('commandeVendeurSelect');
        for(let i=0; i<select.options.length; i++) {
            if(select.options[i].textContent === result.vendeur) { select.value = select.options[i].value; break; }
        }
    }
    switchMode('saisie');
    document.getElementById('collageResult').innerHTML = '';
    showToast('✅ Données collées importées !', 'success');
}

function analyserTexte(text) {
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
// ========== APPELS ==========
let fileAppel = [];
let indexAppel = 0;

async function loadAppels() {
    try {
        const snapshot = await db.collection('commandes').where('statut', '==', 'À appeler').orderBy('dateCreation', 'asc').get();
        const container = document.getElementById('appelsContainer');
        if (snapshot.empty) { container.innerHTML = '<p class="empty-message">Aucune commande en attente.</p>'; return; }
        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            html += `<div class="commande-item"><span class="numero">${data.numero}</span><span class="vendeur">${data.vendeur}</span>
                <span class="montant">${formatNumber(data.prixTotal)} FCFA</span><span class="statut statut-appel">${data.statut}</span></div>`;
        });
        container.innerHTML = html;
    } catch(e) { console.error(e); }
}

function lancerAppelSuivant() {
    playSound('click');
    db.collection('commandes').where('statut','==','À appeler').orderBy('dateCreation','asc').get()
        .then(snapshot => {
            if (snapshot.empty) { showToast('✅ Aucune commande en attente.', 'success'); return; }
            fileAppel = []; snapshot.forEach(doc => fileAppel.push({ id: doc.id, data: doc.data() }));
            indexAppel = 0;
            afficherAppel();
        })
        .catch(e => { console.error(e); showToast('❌ Erreur chargement appels.', 'error'); });
}

function afficherAppel() {
    if (indexAppel >= fileAppel.length) {
        fermerAppelModal();
        showToast('✅ Tous les appels traités !', 'success');
        loadAppels(); loadCommandes(); loadKPI();
        return;
    }
    const item = fileAppel[indexAppel];
    const data = item.data;
    const modal = document.getElementById('appelModal');
    const content = document.getElementById('appelContent');
    const articles = data.articles ? data.articles.map(a => `${a.quantite} x ${a.nom}`).join(', ') : '';
    content.innerHTML = `
        <div class="step-title">📞 APPEL CLIENT</div>
        <div class="step-subtitle">Bon ${indexAppel+1} sur ${fileAppel.length}</div>
        <div class="recap-item"><span>Commande</span><span>${data.numero}</span></div>
        <div class="recap-item"><span>Vendeur</span><span>${data.vendeur}</span></div>
        <div class="recap-item"><span>Articles</span><span>${articles}</span></div>
        <div class="recap-item"><span>Lieu</span><span>${data.quartier}, ${data.ville}</span></div>
        <div class="recap-item"><span>Montant</span><span>${formatNumber(data.prixTotal)} FCFA</span></div>
        <div style="margin:16px 0;display:flex;gap:10px;flex-wrap:wrap;">
            <button onclick="appelerClient('${item.id}')" class="btn-primary" style="flex:1;">📞 Appeler</button>
            <button onclick="whatsappClient('${item.id}')" class="btn-primary" style="flex:1;background:#25D366;">💬 WhatsApp</button>
            <button onclick="smsClient('${item.id}')" class="btn-primary" style="flex:1;background:#8e44ad;">🤖 IA</button>
        </div>
        <div style="margin:16px 0;display:flex;gap:10px;flex-wrap:wrap;">
            <button onclick="validerAppel('${item.id}','Validé')" class="btn-success" style="flex:1;padding:12px;">✅ Validé</button>
            <button onclick="validerAppel('${item.id}','Reporté')" class="btn-secondary" style="flex:1;padding:12px;">📅 Reporté</button>
            <button onclick="validerAppel('${item.id}','Refusé')" class="btn-danger" style="flex:1;padding:12px;">❌ Refusé</button>
        </div>
        <p class="info-text">Le prochain bon apparaîtra automatiquement.</p>`;
    modal.classList.add('active');
}

function fermerAppelModal() { document.getElementById('appelModal').classList.remove('active'); }
document.getElementById('appelModal').addEventListener('click', function(e) { if (e.target === this) fermerAppelModal(); });

async function validerAppel(id, statut) {
    try {
        await db.collection('commandes').doc(id).update({ statut: statut, dateAppel: new Date() });
        playSound('success');
        indexAppel++;
        afficherAppel();
        loadCommandes(); loadAppels(); loadKPI();
    } catch(e) { showToast('❌ Erreur.', 'error'); }
}

function appelerClient(id) {
    playSound('click');
    db.collection('commandes').doc(id).get().then(doc => {
        const data = doc.data();
        const phone = data.telephone || prompt('Numéro du client :');
        if (phone) {
            window.location.href = `tel:${phone.replace(/[^0-9+]/g, '')}`;
        }
        showToast('📞 Appel en cours...', 'info');
        setTimeout(() => {
            if (confirm('Le client a-t-il répondu ?')) { validerAppel(id, 'Validé'); }
            else { showToast('📞 Client injoignable.', 'info'); }
        }, 1500);
    });
}

function whatsappClient(id) {
    playSound('click');
    db.collection('commandes').doc(id).get().then(doc => {
        const data = doc.data();
        const phone = data.telephone || prompt('Numéro WhatsApp du client :');
        if (phone) {
            window.open(`https://wa.me/${phone.replace(/[^0-9+]/g, '').replace('+', '')}?text=Bonjour, nous vous confirmons votre livraison (${data.numero}).`, '_blank');
        }
    });
}

function smsClient(id) {
    playSound('click');
    db.collection('commandes').doc(id).get().then(doc => {
        const data = doc.data();
        const phone = data.telephone || prompt('Numéro du client :');
        if (phone) {
            const lien = `https://hdix.netlify.app/confirmation/${id}`;
            const msg = `📦 Commande ${data.numero}\nConfirmez : OK -> ${lien}/ok | Appelez-moi -> ${lien}/appel | Indisponible -> ${lien}/non`;
            window.open(`https://wa.me/${phone.replace(/[^0-9+]/g, '').replace('+', '')}?text=${encodeURIComponent(msg)}`, '_blank');
        }
    });
}

// ========== MODALE DÉTAIL COMMANDE ==========
async function afficherCommande(id) {
    playSound('click');
    try {
        const doc = await db.collection('commandes').doc(id).get();
        const data = doc.data();
        if (!data) {
            showToast('⚠️ Commande non trouvée.', 'error');
            return;
        }

        const modal = document.getElementById('detailCommandeModal');
        const content = document.getElementById('detailCommandeContent');

        let articlesHtml = '';
        if (data.articles && data.articles.length > 0) {
            data.articles.forEach(a => {
                articlesHtml += `<div class="recap-item"><span>${a.quantite} x ${a.nom}</span></div>`;
            });
        } else {
            articlesHtml = '<span style="color:#6b7a8f;">Aucun article</span>';
        }

        const prix = formatNumber(data.prixTotal || 0);
        const frais = formatNumber(data.fraisLivraison || 0);

        content.innerHTML = `
            <div class="step-title">📋 ${data.numero || 'N/A'}</div>
            <div style="margin-top:8px;">
                <div class="recap-item"><span>Vendeur</span><span><strong>${data.vendeur || 'N/A'}</strong></span></div>
                <div class="recap-item"><span>📞 Téléphone client</span><span><strong>${data.telephone || 'Non renseigné'}</strong></span></div>
                <div class="recap-item"><span>Articles</span></div>
                <div style="padding:4px 0 8px 16px;">${articlesHtml}</div>
                <div class="recap-item"><span>💰 Montant</span><span><strong>${prix} FCFA</strong></span></div>
                <div class="recap-item"><span>🚚 Frais livraison</span><span><strong>${frais} FCFA</strong></span></div>
                <div class="recap-item"><span>📍 Lieu</span><span><strong>${data.quartier || ''}, ${data.ville || ''}</strong></span></div>
                <div class="recap-item"><span>📌 Statut</span><span><span class="statut ${data.statut === 'Livrée' ? 'statut-livree' : data.statut === 'À appeler' ? 'statut-appel' : 'statut-attente'}">${data.statut || 'N/A'}</span></span></div>
                ${data.note ? `<div class="recap-item"><span>📝 Note</span><span>${data.note}</span></div>` : ''}
                <div style="margin-top:12px;border-top:1px solid #e2e8f0;padding-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
                    <button onclick="closeDetailCommandeModal(); modifierCommande('${id}')" class="btn-primary" style="flex:1;padding:8px;">✏️ Modifier</button>
                    ${data.telephone ? `<button onclick="appelerClientDepuisCommande('${data.telephone}')" class="btn-primary" style="flex:1;padding:8px;background:#25D366;">📞 Appeler</button>` : ''}
                    <button onclick="closeDetailCommandeModal()" class="btn-secondary" style="flex:1;padding:8px;">Fermer</button>
                </div>
            </div>
        `;

        modal.classList.add('active');

    } catch(e) {
        console.error(e);
        showToast('❌ Erreur affichage.', 'error');
    }
}

function closeDetailCommandeModal() {
    document.getElementById('detailCommandeModal').classList.remove('active');
}

function appelerClientDepuisCommande(telephone) {
    playSound('click');
    const phone = telephone.replace(/[^0-9+]/g, '');
    if (phone) {
        window.location.href = `tel:${phone}`;
    } else {
        showToast('⚠️ Numéro invalide.', 'error');
    }
}

// ========== COMMANDES CRUD ==========
async function modifierCommande(id) {
    playSound('click');
    await openCommandeModal(id);
}

async function supprimerCommande(id) {
    playSound('click');
    if (!confirm('⚠️ Supprimer définitivement cette commande ?')) return;
    try {
        await db.collection('commandes').doc(id).delete();
        playSound('success');
        showToast('🗑️ Commande supprimée.', 'success');
        loadCommandes(); loadAppels(); loadKPI();
    } catch(e) { showToast('❌ Erreur suppression.', 'error'); }
}

// ========== ASSIGNER LIVREUR ==========
async function assignerCommande(commandeId) {
    playSound('click');
    try {
        const livreurs = await db.collection('livreurs').where('actif', '==', true).get();
        if (livreurs.empty) { showToast('⚠️ Aucun livreur disponible.', 'error'); return; }
        let list = []; livreurs.forEach(d => list.push({ id: d.id, ...d.data() }));
        const opts = list.map((l,i) => `${i+1}. ${l.nom} (${l.zone||'Sans zone'})`).join('\n');
        const choix = prompt(`Sélectionnez un livreur:\n\n${opts}\n\nEntrez le numéro:`);
        if (!choix) return;
        const idx = parseInt(choix)-1;
        if (isNaN(idx)||idx<0||idx>=list.length) { showToast('⚠️ Sélection invalide.', 'error'); return; }
        const livreur = list[idx];
        await db.collection('commandes').doc(commandeId).update({ livreurId: livreur.id, livreurNom: livreur.nom, statut: 'En-cours', dateAssignation: new Date() });
        playSound('success');
        showToast(`✅ Commande assignée à ${livreur.nom} !`, 'success');
        loadCommandes(); loadAppels(); loadKPI();
    } catch(e) { showToast('❌ Erreur assignation.', 'error'); }
}
// ========== VENDEURS ==========
async function loadVendeurs() {
    try {
        const snapshot = await db.collection('vendeurs').orderBy('nom').get();
        const container = document.getElementById('vendeursList');
        if (snapshot.empty) { container.innerHTML = '<p class="empty-message">Aucun vendeur.</p>'; return; }
        let html = '<div class="list-container">';
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const userSnap = await db.collection('users').where('vendeurId','==',doc.id).get();
            let code = 'N/A';
            if (!userSnap.empty) { code = userSnap.docs[0].data().code_secret || 'N/A'; }
            html += `<div class="list-item"><div><strong>${data.nom}</strong><br><small>📞 ${data.telephone} | ${data.abreviation||'N/A'} | 🔑 ${code}</small></div>
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

async function deleteVendeur(id) {
    playSound('click');
    if (!confirm('Supprimer ce vendeur ?')) return;
    try {
        const s = await db.collection('users').where('vendeurId','==',id).get();
        s.forEach(d => db.collection('users').doc(d.id).delete());
        await db.collection('vendeurs').doc(id).delete();
        playSound('success');
        showToast('✅ Vendeur supprimé.', 'success');
        loadVendeurs(); loadKPI();
    } catch(e) { showToast('❌ Erreur.', 'error'); }
}

async function editVendeur(id) {
    playSound('click');
    const doc = await db.collection('vendeurs').doc(id).get();
    const data = doc.data();
    const nom = prompt('Nom:', data.nom); if (!nom) return;
    const tel = prompt('Téléphone:', data.telephone); if (!tel) return;
    const abr = prompt('Abréviation:', data.abreviation); if (!abr) return;
    await db.collection('vendeurs').doc(id).update({ nom, telephone: tel, abreviation: abr.toUpperCase() });
    const s = await db.collection('users').where('vendeurId','==',id).get();
    s.forEach(d => db.collection('users').doc(d.id).update({ nom, telephone: tel }));
    playSound('success');
    showToast('✅ Vendeur modifié.', 'success');
    loadVendeurs();
}

// ========== LIVREURS ==========
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
            html += `<div class="list-item"><div><strong>${data.nom}</strong><br><small>📞 ${data.telephone} | ${data.zone||'N/A'} | 🔑 ${code}</small></div>
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
    db.collection('users').where('code_secret','==',code).get().then(s => {
        if (!s.empty) code = generateCodeSecret();
        return db.collection('livreurs').add({ nom, telephone: tel, zone, capacite: cap||10, actif });
    }).then(docRef => {
        return db.collection('users').add({ nom, role: 'livreur', code_secret: code, telephone: tel, livreurId: docRef.id, dateCreation: new Date() });
    }).then(() => {
        playSound('success');
        showToast(`✅ Livreur ajouté ! Code: ${code}`, 'success');
        if (confirm(`Envoyer le code (${code}) par WhatsApp ?`)) {
            const phone = tel.replace('+','');
            window.open(`https://wa.me/${phone}?text=Bonjour ${nom}, votre code livreur HDIX est: ${code}`, '_blank');
        }
        loadLivreurs(); loadKPI();
    }).catch(e => { console.error(e); showToast('❌ Erreur.', 'error'); });
}

async function deleteLivreur(id) {
    playSound('click');
    if (!confirm('Supprimer ce livreur ?')) return;
    try {
        const s = await db.collection('users').where('livreurId','==',id).get();
        s.forEach(d => db.collection('users').doc(d.id).delete());
        await db.collection('livreurs').doc(id).delete();
        playSound('success');
        showToast('✅ Livreur supprimé.', 'success');
        loadLivreurs(); loadKPI();
    } catch(e) { showToast('❌ Erreur.', 'error'); }
}

async function editLivreur(id) {
    playSound('click');
    const doc = await db.collection('livreurs').doc(id).get();
    const data = doc.data();
    const nom = prompt('Nom:', data.nom); if (!nom) return;
    const tel = prompt('Téléphone:', data.telephone); if (!tel) return;
    const zone = prompt('Zone:', data.zone||''); if (!zone) return;
    const cap = parseInt(prompt('Capacité:', data.capacite||10));
    const actif = confirm(`Actif ? (OK=Oui)`);
    await db.collection('livreurs').doc(id).update({ nom, telephone: tel, zone, capacite: cap||10, actif });
    const s = await db.collection('users').where('livreurId','==',id).get();
    s.forEach(d => db.collection('users').doc(d.id).update({ nom, telephone: tel }));
    playSound('success');
    showToast('✅ Livreur modifié.', 'success');
    loadLivreurs();
}

// ========== STOCKAGE ==========
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

async function ajouterCasier(vendeurId) {
    const n = parseInt(prompt('Nombre de casiers à ajouter :')||'1');
    if (isNaN(n)||n<=0) return;
    try {
        const s = await db.collection('stockage').where('vendeurId','==',vendeurId).where('mois','==',new Date().getMonth()+1).where('annee','==',new Date().getFullYear()).get();
        if (s.empty) {
            await db.collection('stockage').add({ vendeurId, casiers: n, dette: n*5000, mois: new Date().getMonth()+1, annee: new Date().getFullYear() });
        } else {
            const doc = s.docs[0]; const data=doc.data();
            const newCasiers=(data.casiers||0)+n;
            await db.collection('stockage').doc(doc.id).update({ casiers: newCasiers, dette: newCasiers*5000 });
        }
        playSound('success');
        showToast(`✅ ${n} casier(s) ajouté(s)`, 'success');
        loadStockage();
    } catch(e) { showToast('❌ Erreur.', 'error'); }
}

async function retirerCasier(vendeurId) {
    try {
        const s = await db.collection('stockage').where('vendeurId','==',vendeurId).where('mois','==',new Date().getMonth()+1).where('annee','==',new Date().getFullYear()).get();
        if (s.empty) { showToast('⚠️ Aucun casier.', 'error'); return; }
        const doc=s.docs[0]; const data=doc.data();
        const actuel=data.casiers||0;
        if (actuel<=0) { showToast('⚠️ Aucun casier.', 'error'); return; }
        const n=parseInt(prompt(`Casiers actuels: ${actuel}. Combien retirer ?`)||'1');
        if (isNaN(n)||n<=0) return;
        const nouveau=Math.max(0, actuel-n);
        await db.collection('stockage').doc(doc.id).update({ casiers: nouveau, dette: nouveau*5000 });
        playSound('success');
        showToast(`✅ ${n} casier(s) retiré(s)`, 'success');
        loadStockage();
    } catch(e) { showToast('❌ Erreur.', 'error'); }
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
// ========== INSCRIPTIONS ==========
async function loadInscriptions() {
    try {
        const container = document.getElementById('inscriptionsList');
        container.innerHTML = '<div class="spinner" style="margin:20px auto;"></div>';

        const snapshot = await db.collection('inscriptions')
            .orderBy('dateDemande', 'desc')
            .get();

        if (snapshot.empty) {
            container.innerHTML = '<p class="empty-message">Aucune demande d\'inscription.</p>';
            return;
        }

        let html = `
            <div style="margin-bottom:12px;display:flex;gap:8px;flex-wrap:wrap;">
                <button onclick="filtrerInscriptions('toutes')" class="filter-btn active" data-filter="toutes">📋 Toutes</button>
                <button onclick="filtrerInscriptions('en_attente')" class="filter-btn" data-filter="en_attente" style="background:#fef9e7;">⏳ En attente</button>
                <button onclick="filtrerInscriptions('acceptée')" class="filter-btn" data-filter="acceptée" style="background:#eafaf1;">✅ Acceptées</button>
                <button onclick="filtrerInscriptions('refusée')" class="filter-btn" data-filter="refusée" style="background:#fdedec;">❌ Refusées</button>
            </div>
            <div id="inscriptionsListContainer">
        `;

        snapshot.forEach(doc => {
            const data = doc.data();
            const statut = data.statut || 'en_attente';
            const statutClass = statut === 'acceptée' ? 'statut-livree' : 
                               statut === 'refusée' ? 'statut-indisponible' : 'statut-appel';
            const statutLabel = statut === 'acceptée' ? '✅ Acceptée' : 
                               statut === 'refusée' ? '❌ Refusée' : '⏳ En attente';

            const code = statut === 'acceptée' && data.codeSecret ? data.codeSecret : '';
            const telephone = data.telephone || '';

            html += `
                <div class="commande-item inscription-item" data-statut="${statut}">
                    <span class="numero">${data.nom || 'Inconnu'}</span>
                    <span class="vendeur">📞 ${telephone}</span>
                    <span class="localisation">${data.role || 'N/A'}</span>
                    ${code ? `
                        <span class="montant" style="color:#8e44ad;font-weight:700;">🔑 ${code}</span>
                        <span class="actions" style="display:flex;gap:4px;flex-shrink:0;">
                            <button onclick="copierCode('${code}')" title="Copier le code" style="background:#e2e8f0;border:none;border-radius:4px;padding:4px 8px;cursor:pointer;font-size:12px;">📋</button>
                            <button onclick="envoyerCodeWhatsApp('${code}', '${telephone}', '${data.nom || ''}')" title="Envoyer par WhatsApp" style="background:#25D366;border:none;border-radius:4px;padding:4px 8px;cursor:pointer;color:white;font-size:12px;">💬</button>
                        </span>
                    ` : ''}
                    <span class="statut ${statutClass}">${statutLabel}</span>
                    <span class="actions">
                        ${statut === 'en_attente' ? `
                            <button onclick="accepterInscription('${doc.id}')" class="btn-success" style="padding:4px 8px;border:none;border-radius:4px;color:white;cursor:pointer;font-size:12px;">✅</button>
                            <button onclick="refuserInscription('${doc.id}')" class="btn-danger" style="padding:4px 8px;border:none;border-radius:4px;color:white;cursor:pointer;font-size:12px;">❌</button>
                        ` : `
                            <span style="color:#6b7a8f;font-size:11px;">✓</span>
                        `}
                    </span>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;

    } catch (error) {
        console.error('Erreur inscriptions:', error);
        document.getElementById('inscriptionsList').innerHTML = `
            <p class="empty-message" style="color:#c0392b;">
                ❌ Erreur : ${error.message}
                <br><button onclick="loadInscriptions()" class="btn-secondary" style="margin-top:10px;padding:6px 14px;">🔄 Réessayer</button>
            </p>
        `;
    }
}

function copierCode(code) {
    playSound('click');
    navigator.clipboard.writeText(code).then(() => {
        playSound('success');
        showToast(`✅ Code "${code}" copié dans le presse-papiers !`, 'success');
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = code;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast(`✅ Code "${code}" copié !`, 'success');
    });
}

function envoyerCodeWhatsApp(code, telephone, nom) {
    playSound('click');
    if (!telephone) {
        showToast('⚠️ Numéro de téléphone manquant.', 'error');
        return;
    }

    const phone = telephone.replace(/[^0-9+]/g, '');
    const message = `Bonjour ${nom || 'cher(e) client(e)'},\n\nVotre compte HDIX a été activé.\n\n🔑 Votre code secret : ${code}\n\n📱 Lien de connexion : https://hdix.netlify.app\n\nMerci de votre confiance ! 🚀`;

    const url = `https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    showToast('💬 Ouverture de WhatsApp...', 'info');
}

let filtreInscriptions = 'toutes';

function filtrerInscriptions(statut) {
    playSound('click');
    filtreInscriptions = statut;
    document.querySelectorAll('#inscriptionsList .filter-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.filter === statut);
    });

    document.querySelectorAll('.inscription-item').forEach(el => {
        if (statut === 'toutes') {
            el.style.display = 'flex';
        } else {
            el.style.display = el.dataset.statut === statut ? 'flex' : 'none';
        }
    });
}

async function accepterInscription(id) {
    playSound('click');
    if (!confirm('Accepter cette demande ?')) return;

    try {
        const doc = await db.collection('inscriptions').doc(id).get();
        const data = doc.data();
        const code = await generateUniqueCode();

        await db.collection('inscriptions').doc(id).update({
            statut: 'acceptée',
            dateTraitement: new Date(),
            codeSecret: code
        });

        await db.collection('users').add({
            nom: data.nom,
            prenom: data.prenom || '',
            telephone: data.telephone,
            role: data.role,
            code_secret: code,
            boutique: data.boutique || '',
            dateCreation: new Date()
        });

        playSound('success');
        showToast(`✅ Inscription acceptée ! Code: ${code}`, 'success');
        loadInscriptions();
        loadKPI();

    } catch (error) {
        console.error('Erreur acceptation:', error);
        showToast('❌ Erreur lors de l\'acceptation.', 'error');
    }
}

async function refuserInscription(id) {
    playSound('click');
    const motif = prompt('Motif du refus :');

    try {
        await db.collection('inscriptions').doc(id).update({
            statut: 'refusée',
            dateTraitement: new Date(),
            motifRefus: motif || 'Non spécifié'
        });

        playSound('success');
        showToast('❌ Inscription refusée.', 'info');
        loadInscriptions();

    } catch (error) {
        console.error('Erreur refus:', error);
        showToast('❌ Erreur lors du refus.', 'error');
    }
}

// ========== BILAN ==========
async function generateBilan() {
    playSound('click');
    const vendeur = document.getElementById('bilanVendeurSelect').value;
    const container = document.getElementById('bilanContainer');
    try {
        const today = new Date(); today.setHours(0,0,0,0);
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
        let query = db.collection('commandes').where('dateCreation','>=',today).where('dateCreation','<',tomorrow);
        if (vendeur !== 'all') query = query.where('vendeur','==',vendeur);
        const snapshot = await query.get();
        if (snapshot.empty) { container.innerHTML = '<p class="empty-message">Aucune commande.</p>'; return; }
        let totalVentes=0, totalFrais=0, livrees=0, details=[];
        const stats = {'À appeler':0,'En-cours':0,'Livrée':0,'Indisponible':0,'Va rappeler':0,'Annulée':0,'Refusée':0,'Reportée':0};
        let vendeurNom='';
        snapshot.forEach(doc => {
            const data = doc.data();
            vendeurNom = data.vendeur||'Inconnu';
            totalVentes += data.prixTotal||0;
            totalFrais += data.fraisLivraison||0;
            stats[data.statut] = (stats[data.statut]||0)+1;
            if (data.statut === 'Livrée') livrees++;
            details.push(`${data.numero} (${data.quartier||'?'}) : ${formatNumber(data.prixTotal)} FCFA - ${data.statut}`);
        });
        const aEnvoyer = totalVentes - totalFrais;
        let s = '';
        for (const [k,v] of Object.entries(stats)) s += `<div><strong>${k} :</strong> ${v}</div>`;
        container.innerHTML = `<div class="bilan-result"><h4>📊 Bilan - ${vendeurNom}</h4><div class="bilan-stats">${s}</div>
            <div class="bilan-stats" style="border-top:1px solid #e2e8f0;padding-top:12px;margin-top:8px;">
            <div><strong>💰 Total :</strong> ${formatNumber(totalVentes)} FCFA</div><div><strong>🚚 Livraison :</strong> ${formatNumber(totalFrais)} FCFA</div>
            <div><strong>📤 À envoyer :</strong> ${formatNumber(aEnvoyer)} FCFA</div><div><strong>✅ Livrées :</strong> ${livrees}/${snapshot.size}</div></div>
            <div class="bilan-details"><strong>📦 Détail :</strong><br>${details.join('<br>')}</div></div>`;
    } catch(e) { showToast('❌ Erreur bilan.', 'error'); }
}

async function copyBilan() {
    playSound('click');
    const vendeur = document.getElementById('bilanVendeurSelect').value;
    try {
        const today = new Date(); today.setHours(0,0,0,0);
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
        let query = db.collection('commandes').where('dateCreation','>=',today).where('dateCreation','<',tomorrow);
        if (vendeur !== 'all') query = query.where('vendeur','==',vendeur);
        const snapshot = await query.get();
        if (snapshot.empty) { showToast('⚠️ Aucune commande.', 'error'); return; }
        let totalVentes=0, totalFrais=0, vendeurNom='';
        const stats={'À appeler':0,'En-cours':0,'Livrée':0,'Indisponible':0,'Va rappeler':0,'Annulée':0,'Refusée':0,'Reportée':0};
        let details=[];
        snapshot.forEach(doc => {
            const data = doc.data();
            vendeurNom = data.vendeur||'Inconnu';
            totalVentes += data.prixTotal||0;
            totalFrais += data.fraisLivraison||0;
            stats[data.statut] = (stats[data.statut]||0)+1;
            details.push(`${data.numero} (${data.quartier||'?'}) : ${formatNumber(data.prixTotal)} FCFA - ${data.statut}`);
        });
        const aEnvoyer = totalVentes - totalFrais;
        const dateStr = today.toLocaleDateString('fr-FR');
        let text = `📊 BILAN DU ${dateStr} - ${vendeurNom}\n\n`;
        text += `🔴 À appeler    : ${stats['À appeler']}\n🔴 En-cours     : ${stats['En-cours']}\n🔴 Livrée       : ${stats['Livrée']}\n`;
        text += `🔴 Indisponible : ${stats['Indisponible']}\n🔴 Va rappeler  : ${stats['Va rappeler']}\n🔴 Annulée      : ${stats['Annulée']}\n`;
        text += `🔴 Refusée      : ${stats['Refusée']}\n🔴 Reportée     : ${stats['Reportée']}\n\n`;
        text += `💰 Montant total   : ${formatNumber(totalVentes)} FCFA\n🚚 Livraison total : ${formatNumber(totalFrais)} FCFA\n📤 À envoyer       : ${formatNumber(aEnvoyer)} FCFA\n\n📦 Détail :\n${details.join('\n')}`;
        await navigator.clipboard.writeText(text);
        playSound('success');
        showToast('✅ Bilan copié !', 'success');
    } catch(e) { showToast('❌ Erreur copie.', 'error'); }
}
// ========== BILAN (suite) ==========
async function generatePDF() {
    playSound('click');
    showToast('📄 Fonctionnalité PDF bientôt disponible.', 'info');
}

async function envoyerBilanWhatsApp() {
    playSound('click');
    const vendeur = document.getElementById('bilanVendeurSelect').value;
    try {
        const today = new Date(); today.setHours(0,0,0,0);
        let query = db.collection('commandes').where('dateCreation','>=',today);
        if (vendeur !== 'all') query = query.where('vendeur','==',vendeur);
        const snapshot = await query.get();
        if (snapshot.empty) { showToast('⚠️ Aucune commande.', 'error'); return; }
        let total=0, vendeurNom='', details=[];
        snapshot.forEach(doc => {
            const data=doc.data();
            vendeurNom=data.vendeur||'Inconnu';
            total += data.prixTotal||0;
            details.push(`${data.numero} : ${formatNumber(data.prixTotal)} FCFA - ${data.statut}`);
        });
        const msg = `📊 BILAN DU ${today.toLocaleDateString('fr-FR')} - ${vendeurNom}\n\n💰 Total : ${formatNumber(total)} FCFA\n\n📦 Détail :\n${details.join('\n')}`;
        const phone = prompt('Numéro WhatsApp du vendeur :');
        if (phone) { window.open(`https://wa.me/${phone.replace('+','')}?text=${encodeURIComponent(msg)}`, '_blank'); }
    } catch(e) { showToast('❌ Erreur.', 'error'); }
}

async function generateMonthlyReport() {
    playSound('click');
    showToast('📊 Rapport mensuel bientôt disponible.', 'info');
    document.getElementById('monthlyReportContainer').innerHTML = '<div class="bilan-result"><h4>📈 Rapport mensuel</h4><p>Fonctionnalité en développement.</p></div>';
}

// ========== TOURNÉES ==========
async function optimiserTournees() {
    playSound('click');
    showSpinner();
    try {
        const snapshot = await db.collection('commandes').where('statut','in',['En-cours','À appeler']).get();
        const container = document.getElementById('tourneesContainer');
        if (snapshot.empty) { container.innerHTML = '<p class="empty-message">Aucune commande en cours.</p>'; hideSpinner(); return; }
        const zones = ['Libreville','Akanda','Owendo','Bikélé'];
        const cmds = []; snapshot.forEach(d => cmds.push({ id: d.id, ...d.data() }));
        cmds.sort((a,b) => (zones.indexOf(a.zone)=== -1?999:zones.indexOf(a.zone)) - (zones.indexOf(b.zone)===-1?999:zones.indexOf(b.zone)));
        let html = `<div class="bilan-result"><h4>🗺️ Itinéraire optimisé</h4><p style="color:#6b7a8f;">${cmds.length} commandes</p><div style="margin-top:12px;">`;
        cmds.forEach((c,i) => { html += `<div class="recap-item"><span>${i+1}. ${c.numero}</span><span>${c.zone||'N/A'}</span><span style="font-size:12px;color:#6b7a8f;">${c.quartier}</span></div>`; });
        html += '</div></div>';
        container.innerHTML = html;
        showToast('✅ Tournées optimisées !', 'success');
    } catch(e) { showToast('❌ Erreur optimisation.', 'error'); }
    hideSpinner();
}

async function attributionAuto() {
    playSound('click');
    showSpinner();
    try {
        const livreurs = await db.collection('livreurs').where('actif','==',true).get();
        if (livreurs.empty) { showToast('⚠️ Aucun livreur actif.', 'error'); hideSpinner(); return; }
        const list = []; livreurs.forEach(d => list.push({ id: d.id, ...d.data(), charge:0 }));
        const cmds = await db.collection('commandes').where('statut','==','À appeler').get();
        if (cmds.empty) { showToast('⚠️ Aucune commande à attribuer.', 'error'); hideSpinner(); return; }
        let attribuees=0;
        for (const doc of cmds.docs) {
            list.sort((a,b) => a.charge - b.charge);
            const l = list[0];
            if (l && l.charge < (l.capacite||15)) {
                await db.collection('commandes').doc(doc.id).update({ livreurId: l.id, livreurNom: l.nom, statut: 'En-cours', dateAssignation: new Date() });
                l.charge++; attribuees++;
            }
        }
        playSound('success');
        showToast(`✅ ${attribuees} commandes attribuées !`, 'success');
        loadCommandes(); loadAppels(); optimiserTournees(); loadKPI();
    } catch(e) { showToast('❌ Erreur attribution.', 'error'); }
    hideSpinner();
}

// ========== STOCK ==========
async function openStockModal() {
    playSound('click');
    document.getElementById('stockModal').classList.add('active');
    await loadVendeursForSelect('stockVendeurSelect');
    document.getElementById('stockArticlesContainer').innerHTML = '';
    addStockRow();
}

function closeStockModal() {
    playSound('click');
    document.getElementById('stockModal').classList.remove('active');
}

function addStockRow() {
    playSound('click');
    const container = document.getElementById('stockArticlesContainer');
    const row = document.createElement('div');
    row.className = 'article-row';
    row.innerHTML = `<input type="text" class="stock-article-name" placeholder="Nom de l'article" /><input type="number" class="stock-article-qty" placeholder="Quantité" min="1" value="1" />`;
    container.appendChild(row);
}

async function saveStock() {
    const select = document.getElementById('stockVendeurSelect');
    const vendeurId = select.value;
    if (!vendeurId) { showToast('⚠️ Sélectionnez un vendeur.', 'error'); return; }
    const rows = document.querySelectorAll('#stockArticlesContainer .article-row');
    const articles = [];
    rows.forEach(row => {
        const name = row.querySelector('.stock-article-name').value.trim();
        const qty = parseInt(row.querySelector('.stock-article-qty').value);
        if (name && qty > 0) articles.push({ nom: name, quantite: qty });
    });
    if (articles.length === 0) { showToast('⚠️ Ajoutez au moins un article.', 'error'); return; }
    try {
        const vendeurDoc = await db.collection('vendeurs').doc(vendeurId).get();
        const vendeurNom = vendeurDoc.data().nom;
        for (const a of articles) {
            const existing = await db.collection('stock').where('vendeurId','==',vendeurId).where('nom','==',a.nom).get();
            if (existing.empty) { await db.collection('stock').add({ vendeurId, vendeurNom, nom: a.nom, quantite: a.quantite }); }
            else { const doc = existing.docs[0]; await db.collection('stock').doc(doc.id).update({ quantite: (doc.data().quantite||0) + a.quantite }); }
        }
        playSound('success');
        showToast(`✅ Stock ajouté pour ${vendeurNom} !`, 'success');
        closeStockModal();
        loadStockage();
    } catch(e) { console.error(e); showToast('❌ Erreur stockage.', 'error'); }
}

async function consulterStock() {
    playSound('click');
    document.getElementById('consulterStockModal').classList.add('active');
    await rafraichirStock();
}

function closeConsulterStockModal() {
    playSound('click');
    document.getElementById('consulterStockModal').classList.remove('active');
}

async function rafraichirStock() {
    try {
        const snapshot = await db.collection('stock').get();
        const container = document.getElementById('stockListContainer');
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
                    <div><button onclick="retirerStock('${a.id}')" class="btn-delete">➖ Retirer</button></div></div>`;
            });
        }
        html += '</div>';
        container.innerHTML = html;
    } catch(e) { console.error(e); }
}

async function retirerStock(id) {
    const qty = prompt('Quantité à retirer :');
    if (!qty) return;
    const num = parseInt(qty);
    if (isNaN(num) || num <= 0) { showToast('⚠️ Quantité invalide.', 'error'); return; }
    try {
        const doc = await db.collection('stock').doc(id).get();
        const data = doc.data();
        const newQty = (data.quantite || 0) - num;
        if (newQty < 0) { showToast('⚠️ Stock insuffisant.', 'error'); return; }
        if (newQty === 0) { await db.collection('stock').doc(id).delete(); }
        else { await db.collection('stock').doc(id).update({ quantite: newQty }); }
        playSound('success');
        showToast('✅ Stock retiré avec succès !', 'success');
        await rafraichirStock();
        loadStockage();
    } catch(e) { console.error(e); showToast('❌ Erreur retrait.', 'error'); }
}

// ========== UTILITAIRES ==========
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

// ========== VENDEURS BILAN ==========
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
    loadKPI();
    loadCommandes();
    loadAppels();
    loadVendeursForBilan();

    // Fermer les modales en cliquant sur le fond
    document.getElementById('commandeModal').addEventListener('click', function(e) {
        if (e.target === this) closeCommandeModal();
    });
    document.getElementById('stockModal').addEventListener('click', function(e) {
        if (e.target === this) closeStockModal();
    });
    document.getElementById('consulterStockModal').addEventListener('click', function(e) {
        if (e.target === this) closeConsulterStockModal();
    });
    document.getElementById('appelModal').addEventListener('click', function(e) {
        if (e.target === this) fermerAppelModal();
    });
    document.getElementById('detailCommandeModal').addEventListener('click', function(e) {
        if (e.target === this) closeDetailCommandeModal();
    });
});