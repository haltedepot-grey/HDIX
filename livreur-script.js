// livreur-script.js - Version complète avec sons personnalisés

// ========== SONS PERSONNALISÉS ==========
let clickSoundL = null;
let successSoundL = null;
let errorSoundL = null;

function loadSoundsL() {
    try {
        clickSoundL = new Audio('assets/sounds/click.mp3');
        successSoundL = new Audio('assets/sounds/success.mp3');
        errorSoundL = new Audio('assets/sounds/error.mp3');
        clickSoundL.load();
        successSoundL.load();
        errorSoundL.load();
    } catch(e) {
        console.log('Sons non disponibles');
    }
}

function playSoundL(type) {
    try {
        if (type === 'click' && clickSoundL) {
            clickSoundL.currentTime = 0;
            clickSoundL.play().catch(e => {});
        } else if (type === 'success' && successSoundL) {
            successSoundL.currentTime = 0;
            successSoundL.play().catch(e => {});
        } else if (type === 'error' && errorSoundL) {
            errorSoundL.currentTime = 0;
            errorSoundL.play().catch(e => {});
        }
    } catch(e) {}
}

loadSoundsL();

// ========== TOAST ==========
function showToastL(message, type = 'info') {
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

function logoutL() {
    playSoundL('click');
    if (window.watchId) navigator.geolocation.clearWatch(window.watchId);
    sessionStorage.removeItem('user');
    window.location.href = 'index.html';
}

// ========== GEOLOCALISATION ==========
let livreurId = null;
let watchId = null;

function initGeolocalisation() {
    if ("geolocation" in navigator) {
        watchId = navigator.geolocation.watchPosition(
            function(pos) {
                const position = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                updatePosition(position);
            },
            function(error) { console.error('Erreur géoloc:', error); },
            { enableHighAccuracy: true, timeout: 30000, maximumAge: 10000 }
        );
        window.watchId = watchId;
    } else {
        document.getElementById('map').innerHTML = '⚠️ Géolocalisation non disponible';
    }
}

async function updatePosition(pos) {
    if (!livreurId) return;
    try {
        await db.collection('positions_livreurs').doc(livreurId).set({
            lat: pos.lat, lng: pos.lng, date: new Date(), livreurId: livreurId
        }, { merge: true });
        const mapEl = document.getElementById('map');
        mapEl.innerHTML = `<div style="text-align:center;padding:20px;"><div style="font-size:40px;">📍</div>
            <div style="font-weight:600;color:#1a2b4c;">${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}</div>
            <div style="color:#6b7a8f;font-size:13px;">Dernière mise à jour : ${new Date().toLocaleTimeString()}</div></div>`;
    } catch(e) { console.error(e); }
}

// ========== CHARGEMENT LIVREUR ==========
async function loadLivreur() {
    try {
        const user = JSON.parse(sessionStorage.getItem('user') || '{}');
        document.getElementById('livreurName').textContent = user.nom || 'Livreur';

        const snapshot = await db.collection('livreurs').where('nom','==',user.nom).get();
        if (snapshot.empty) {
            document.getElementById('livreurNom').textContent = 'Non trouvé';
            document.getElementById('livreurZone').textContent = '-';
            document.getElementById('livreurStatut').textContent = '❌ Non enregistré';
            return;
        }
        const doc = snapshot.docs[0];
        const data = doc.data();
        livreurId = doc.id;
        document.getElementById('livreurNom').textContent = data.nom || 'Livreur';
        document.getElementById('livreurZone').textContent = data.zone || 'Non définie';
        document.getElementById('livreurStatut').textContent = data.actif ? '✅ Disponible' : '⛔ Indisponible';

        initGeolocalisation();
        loadMesCommandes();
    } catch(e) { console.error(e); }
}

// ========== COMMANDES LIVREUR ==========
async function loadMesCommandes() {
    // ... (contenu existant)
}

// ========== ACTIONS LIVREUR ==========
function appelerClientL(id) {
    playSoundL('click');
    // ... (contenu existant)
}

async function marquerLivreeL(commandeId) {
    playSoundL('click');
    if (!confirm('Confirmer la livraison de cette commande ?')) return;
    // ... (contenu existant)
    playSoundL('success');
}

async function marquerIndisponibleL(commandeId) {
    playSoundL('click');
    // ... (contenu existant)
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', function() {
    const user = sessionStorage.getItem('user');
    if (!user) { window.location.href = 'index.html'; return; }
    try {
        const u = JSON.parse(user);
        if (u.role !== 'livreur') { window.location.href = 'index.html'; return; }
    } catch { window.location.href = 'index.html'; return; }
    loadLivreur();
});