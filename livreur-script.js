// livreur-script.js - Version ultime

const AudioContextL = window.AudioContext || window.webkitAudioContext;
let audioCtxL = null;
let livreurId = null;
let watchId = null;

function playSoundL(type) {
    try {
        if (!audioCtxL) audioCtxL = new AudioContextL();
        const oscillator = audioCtxL.createOscillator();
        const gainNode = audioCtxL.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtxL.destination);
        oscillator.type = 'sine';
        gainNode.gain.value = 0.3;
        
        if (type === 'click') {
            oscillator.frequency.value = 600;
            oscillator.start();
            oscillator.stop(audioCtxL.currentTime + 0.05);
        } else if (type === 'success') {
            oscillator.frequency.value = 880;
            oscillator.start();
            setTimeout(() => {
                const osc2 = audioCtxL.createOscillator();
                const gain2 = audioCtxL.createGain();
                osc2.connect(gain2);
                gain2.connect(audioCtxL.destination);
                osc2.frequency.value = 1100;
                osc2.type = 'sine';
                gain2.gain.value = 0.3;
                osc2.start();
                osc2.stop(audioCtxL.currentTime + 0.05);
            }, 100);
            oscillator.stop(audioCtxL.currentTime + 0.1);
        } else if (type === 'error') {
            oscillator.frequency.value = 300;
            oscillator.type = 'sawtooth';
            gainNode.gain.value = 0.2;
            oscillator.start();
            oscillator.stop(audioCtxL.currentTime + 0.15);
        }
    } catch(e) {}
}

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

function logout() {
    playSoundL('click');
    if (watchId) navigator.geolocation.clearWatch(watchId);
    sessionStorage.removeItem('user');
    window.location.href = 'index.html';
}

// ============================================
// GÉOLOCALISATION
// ============================================
function initGeolocalisation() {
    if ("geolocation" in navigator) {
        watchId = navigator.geolocation.watchPosition(
            function(position) {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                updatePosition(pos);
            },
            function(error) {
                console.error('Erreur géolocalisation:', error);
            },
            {
                enableHighAccuracy: true,
                timeout: 30000,
                maximumAge: 10000
            }
        );
    } else {
        document.getElementById('map').innerHTML = '⚠️ Géolocalisation non disponible';
    }
}

async function updatePosition(pos) {
    if (!livreurId) return;
    try {
        await db.collection('positions_livreurs').doc(livreurId).set({
            lat: pos.lat,
            lng: pos.lng,
            date: new Date(),
            livreurId: livreurId
        }, { merge: true });
        
        // Mettre à jour l'affichage
        const mapEl = document.getElementById('map');
        mapEl.innerHTML = `
            <div style="text-align:center;padding:20px;">
                <div style="font-size:40px;">📍</div>
                <div style="font-weight:600;color:#1a2b4c;">${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}</div>
                <div style="color:#6b7a8f;font-size:13px;">Dernière mise à jour : ${new Date().toLocaleTimeString()}</div>
            </div>
        `;
    } catch (error) {
        console.error('Erreur mise à jour position:', error);
    }
}

// ============================================
// CHARGEMENT LIVREUR
// ============================================
async function loadLivreur() {
    try {
        const user = JSON.parse(sessionStorage.getItem('user') || '{}');
        document.getElementById('livreurName').textContent = user.nom || 'Livreur';
        
        const snapshot = await db.collection('livreurs')
            .where('nom', '==', user.nom)
            .get();
        
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
    } catch (error) {
        console.error('Erreur:', error);
    }
}

// ============================================
// CHARGEMENT COMMANDES
// ============================================
async function loadMesCommandes() {
    try {
        const snapshot = await db.collection('commandes')
            .where('livreurId', '==', livreurId)
            .where('statut', 'in', ['En-cours', 'À appeler'])
            .orderBy('dateCreation', 'asc')
            .get();
        
        const container = document.getElementById('commandesContainer');
        const logContainer = document.getElementById('logContainer');
        
        if (snapshot.empty) {
            container.innerHTML = '<p class="empty-message">Aucune commande à livrer.</p>';
            logContainer.innerHTML = '<p style="color:#6b7a8f;">✅ Tournée terminée !</p>';
            return;
        }
        
        let html = '';
        let logs = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            const articles = data.articles ? data.articles.map(a => `${a.quantite}x ${a.nom}`).join(', ') : '';
            html += `
                <div class="commande-item">
                    <div>
                        <strong>${data.numero}</strong> - ${data.vendeur}
                        <br><small>${data.quartier}, ${data.ville} | ${data.prixTotal} FCFA</small>
                        <br><small style="color:#6b7a8f;">${articles}</small>
                    </div>
                    <div>
                        <button onclick="appelerClientLivreur('${doc.id}')" class="btn-appeler">📞 Appeler</button>
                        <button onclick="marquerIndisponible('${doc.id}')" class="btn-indispo">⏳ Indispo</button>
                        <button onclick="marquerLivree('${doc.id}')" class="btn-livrer">✅ Livrée</button>
                    </div>
                </div>
            `;
            logs.push(`${data.numero} - ${data.quartier}, ${data.ville}`);
        });
        
        container.innerHTML = html;
        logContainer.innerHTML = `
            <strong>📋 Tournée en cours :</strong><br>
            ${logs.map(l => `• ${l}`).join('<br>')}
        `;
    } catch (error) {
        console.error('Erreur:', error);
    }
}

// ============================================
// ACTIONS LIVREUR
// ============================================
function appelerClientLivreur(id) {
    playSoundL('click');
    db.collection('commandes').doc(id).get().then(doc => {
        const data = doc.data();
        const phone = data.telephone || prompt('Numéro du client :');
        if (phone) {
            if (confirm('Ouvrir l\'appel téléphonique ?')) {
                window.location.href = `tel:${phone}`;
            }
            if (confirm('Ouvrir WhatsApp ?')) {
                window.open(`https://wa.me/${phone.replace('+', '')}`, '_blank');
            }
        }
    });
}

async function marquerLivree(commandeId) {
    playSoundL('click');
    if (!confirm('Confirmer la livraison de cette commande ?')) return;
    
    try {
        const photoConfirmee = confirm('Preuve de livraison ? (Photo prise ✅)');
        if (!photoConfirmee) return;
        
        await db.collection('commandes').doc(commandeId).update({
            statut: 'Livrée',
            dateLivraison: new Date()
        });
        
        playSoundL('success');
        showToastL('✅ Commande marquée comme livrée !', 'success');
        loadMesCommandes();
    } catch (error) {
        console.error('Erreur:', error);
        playSoundL('error');
        showToastL('❌ Erreur lors de la mise à jour.', 'error');
    }
}

async function marquerIndisponible(commandeId) {
    playSoundL('click');
    if (!confirm('Client indisponible ? Cette commande restera en attente.')) return;
    
    try {
        await db.collection('commandes').doc(commandeId).update({
            statut: 'Indisponible'
        });
        
        playSoundL('success');
        showToastL('⏳ Commande marquée comme "Client indisponible".', 'info');
        loadMesCommandes();
    } catch (error) {
        console.error('Erreur:', error);
        playSoundL('error');
        showToastL('❌ Erreur lors de la mise à jour.', 'error');
    }
}

// ============================================
// INITIALISATION
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    const user = sessionStorage.getItem('user');
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    loadLivreur();
});