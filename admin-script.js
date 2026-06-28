// admin-script.js - PARTIE 1

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

function logout() { playSound('click'); sessionStorage.removeItem('user'); window.location.href = 'index.html'; }

// ========== KPI ==========
async function loadKPI() {
    showSpinner();
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
    hideSpinner();
}

// ========== COMMANDES ==========
let filtreActif = 'all';
async function loadCommandes() {
    // ... (contenu existant)
}

function filtrerCommandes(statut) {
    playSound('click');
    filtreActif = statut;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === statut));
    loadCommandes();
}
// admin-script.js - PARTIE 2 (Vendeurs)

// ========== VENDEURS ==========
async function loadVendeurs() {
    try {
        const snapshot = await db.collection('vendeurs').orderBy('nom').get();
        const container = document.getElementById('vendeursList');
        if (snapshot.empty) {
            container.innerHTML = '<p class="empty-message">Aucun vendeur.</p>';
            return;
        }
        let html = '<div class="list-container">';
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const userSnap = await db.collection('users').where('vendeurId', '==', doc.id).get();
            let code = 'N/A';
            let status = '🔴 Compte manquant';
            if (!userSnap.empty) {
                const userData = userSnap.docs[0].data();
                code = userData.code_secret || 'N/A';
                status = '✅ OK';
            }
            html += `<div class="list-item">
                <div>
                    <strong>${data.nom}</strong>
                    <br><small>📞 ${data.telephone} | ${data.abreviation||'N/A'} | 🔑 ${code}</small>
                    <br><small style="color:${userSnap.empty ? '#c0392b' : '#2d7d46'};">${status}</small>
                </div>
                <div>
                    <button onclick="editVendeur('${doc.id}')" class="btn-edit">✏️</button>
                    <button onclick="deleteVendeur('${doc.id}')" class="btn-delete">🗑️</button>
                    ${!userSnap.empty ? `<button onclick="resetVendeurCode('${doc.id}')" class="btn-edit" style="background:#fef9e7;">🔑</button>` : ''}
                </div>
            </div>`;
        }
        html += '</div>';
        container.innerHTML = html;
    } catch(e) { console.error(e); }
}

function openVendeurForm() {
    playSound('click');
    const nom = prompt('Nom du vendeur :');
    if (!nom) return;
    const tel = prompt('Téléphone :');
    if (!tel) return;
    const abr = prompt('Abréviation (ex: MODE) :');
    if (!abr) return;

    let code = generateCodeSecret();

    db.collection('users').where('code_secret', '==', code).get()
        .then(snapshot => {
            if (!snapshot.empty) { code = generateCodeSecret(); }
            return db.collection('vendeurs').add({
                nom: nom,
                telephone: tel,
                abreviation: abr.toUpperCase()
            });
        })
        .then(docRef => {
            return db.collection('users').add({
                nom: nom,
                role: 'vendeur',
                code_secret: code,
                telephone: tel,
                vendeurId: docRef.id,
                dateCreation: new Date()
            });
        })
        .then(() => {
            playSound('success');
            showToast(`✅ Vendeur ajouté ! Code: ${code}`, 'success');
            if (confirm(`Envoyer le code (${code}) par WhatsApp ?`)) {
                const phone = tel.replace('+', '');
                window.open(`https://wa.me/${phone}?text=Bonjour ${nom}, votre code vendeur HDIX est: ${code}`, '_blank');
            }
            loadVendeurs();
            loadKPI();
        })
        .catch(e => { console.error(e); showToast('❌ Erreur.', 'error'); });
}

async function deleteVendeur(id) {
    playSound('click');
    if (!confirm('Supprimer ce vendeur ?')) return;
    try {
        const s = await db.collection('users').where('vendeurId', '==', id).get();
        s.forEach(d => db.collection('users').doc(d.id).delete());
        await db.collection('vendeurs').doc(id).delete();
        playSound('success');
        showToast('✅ Vendeur supprimé.', 'success');
        loadVendeurs();
        loadKPI();
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
    const s = await db.collection('users').where('vendeurId', '==', id).get();
    s.forEach(d => db.collection('users').doc(d.id).update({ nom, telephone: tel }));
    playSound('success');
    showToast('✅ Vendeur modifié.', 'success');
    loadVendeurs();
}

async function resetVendeurCode(id) {
    playSound('click');
    if (!confirm('Réinitialiser le code secret de ce vendeur ?')) return;
    try {
        const newCode = await generateUniqueCode();
        const s = await db.collection('users').where('vendeurId', '==', id).get();
        if (s.empty) { showToast('⚠️ Utilisateur non trouvé.', 'error'); return; }
        await db.collection('users').doc(s.docs[0].id).update({ code_secret: newCode });
        const vendeurDoc = await db.collection('vendeurs').doc(id).get();
        const vendeurData = vendeurDoc.data();
        playSound('success');
        showToast(`✅ Nouveau code: ${newCode}`, 'success');
        if (confirm(`Envoyer le nouveau code (${newCode}) par WhatsApp ?`)) {
            const phone = vendeurData.telephone.replace('+', '');
            window.open(`https://wa.me/${phone}?text=Bonjour ${vendeurData.nom}, votre nouveau code HDIX est: ${newCode}`, '_blank');
        }
        loadVendeurs();
    } catch(e) { showToast('❌ Erreur.', 'error'); }
}

// ========== RÉPARER LES VENDEURS ==========
async function reparerVendeurs() {
    playSound('click');
    if (!confirm('🔧 Voulez-vous réparer automatiquement les comptes vendeurs ?\n\nCette action va :\n- Vérifier tous les vendeurs\n- Créer les comptes utilisateurs manquants\n- Lier les vendeurs aux comptes utilisateurs\n- Générer des codes secrets pour ceux qui n\'en ont pas')) {
        return;
    }

    showSpinner();
    let stats = { total: 0, crees: 0, dejaOk: 0, erreurs: 0 };
    let details = [];

    try {
        const vendeursSnap = await db.collection('vendeurs').get();
        stats.total = vendeursSnap.size;

        if (vendeursSnap.empty) {
            hideSpinner();
            showToast('⚠️ Aucun vendeur à réparer.', 'info');
            return;
        }

        for (const doc of vendeursSnap.docs) {
            const vendeurData = doc.data();
            const vendeurId = doc.id;

            const userSnap = await db.collection('users')
                .where('vendeurId', '==', vendeurId)
                .get();

            if (!userSnap.empty) {
                const userData = userSnap.docs[0].data();
                if (!userData.code_secret) {
                    const newCode = generateCodeSecret();
                    await db.collection('users').doc(userSnap.docs[0].id).update({
                        code_secret: newCode
                    });
                    stats.dejaOk++;
                    details.push(`✅ ${vendeurData.nom} : code secret ajouté (${newCode})`);
                } else {
                    stats.dejaOk++;
                    details.push(`✅ ${vendeurData.nom} : déjà OK`);
                }
            } else {
                const newCode = generateCodeSecret();
                await db.collection('users').add({
                    nom: vendeurData.nom,
                    role: 'vendeur',
                    code_secret: newCode,
                    telephone: vendeurData.telephone || '',
                    vendeurId: vendeurId,
                    dateCreation: new Date()
                });
                stats.crees++;
                details.push(`🆕 ${vendeurData.nom} : compte créé (${newCode})`);
            }
        }

        hideSpinner();
        playSound('success');

        let message = `✅ Réparation terminée !\n\n`;
        message += `📊 Total vendeurs : ${stats.total}\n`;
        message += `🆕 Comptes créés : ${stats.crees}\n`;
        message += `✅ Déjà OK : ${stats.dejaOk}\n`;
        message += `❌ Erreurs : ${stats.erreurs}\n\n`;
        message += `📋 Détail :\n${details.slice(0, 20).join('\n')}`;
        if (details.length > 20) {
            message += `\n... et ${details.length - 20} autres.`;
        }

        alert(message);
        loadVendeurs();

        if (stats.crees > 0) {
            if (confirm(`📱 ${stats.crees} nouveaux codes ont été générés. Voulez-vous les envoyer par WhatsApp aux vendeurs concernés ?`)) {
                const repairedSnap = await db.collection('users')
                    .where('role', '==', 'vendeur')
                    .where('dateCreation', '>=', new Date(Date.now() - 60000))
                    .get();
                let count = 0;
                for (const doc of repairedSnap.docs) {
                    const data = doc.data();
                    if (data.telephone && data.code_secret) {
                        const phone = data.telephone.replace('+', '');
                        const messageWA = `Bonjour ${data.nom},\n\nVotre compte vendeur HDIX a été activé.\n🔑 Code : ${data.code_secret}\n\nLien : https://hdix.vercel.app`;
                        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(messageWA)}`, '_blank');
                        count++;
                        await new Promise(r => setTimeout(r, 500));
                    }
                }
                showToast(`✅ ${count} messages WhatsApp ouverts !`, 'success');
            }
        }

    } catch (error) {
        console.error('Erreur réparation:', error);
        hideSpinner();
        playSound('error');
        showToast('❌ Erreur lors de la réparation.', 'error');
    }
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
        const s = await db.collection('users').where('code_secret', '==', code).get();
        if(s.empty) unique=true;
        else { code=generateCodeSecret(); attempts++; }
    }
    return code;
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
    loadVendeurs();

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
    document.getElementById('collageConfirmationModal').addEventListener('click', function(e) {
        if (e.target === this) closeCollageConfirmation();
    });
});