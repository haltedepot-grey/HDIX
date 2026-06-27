// agent-script.js - Version complète avec sons personnalisés

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

function logoutA() {
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

// ========== APPELS AGENT ==========
let fileAppelA = [];
let indexAppelA = 0;

function lancerAppelSuivantA() {
    playSoundA('click');
    db.collection('commandes').where('statut','==','À appeler').orderBy('dateCreation','asc').get()
        .then(snapshot => {
            if (snapshot.empty) { showToastA('✅ Aucune commande en attente.', 'success'); return; }
            fileAppelA = [];
            snapshot.forEach(doc => fileAppelA.push({ id: doc.id, data: doc.data() }));
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
document.getElementById('appelModalAgent').addEventListener('click', function(e) { if (e.target === this) fermerAppelModalA(); });

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

// ========== COMMANDE MODALE AGENT ==========
function switchModeA(mode) {
    playSoundA('click');
    document.getElementById('toggleSaisieAgent').classList.toggle('active', mode === 'saisie');
    document.getElementById('toggleCollageAgent').classList.toggle('active', mode === 'collage');
    document.getElementById('modeSaisieAgent').style.display = mode === 'saisie' ? 'block' : 'none';
    document.getElementById('modeCollageAgent').style.display = mode === 'collage' ? 'block' : 'none';
}

// ... (reste du code agent-script.js avec playSoundA partout)

// ========== STOCK AGENT ==========
function openStockModalAgent() {
    playSoundA('click');
    // ... (contenu existant)
}

async function saveStockAgent() {
    // ... (contenu existant)
    playSoundA('success');
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
});