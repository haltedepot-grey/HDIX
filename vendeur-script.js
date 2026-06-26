// vendeur-script.js - Version ultime

const AudioContextV = window.AudioContext || window.webkitAudioContext;
let audioCtxV = null;
let vendeurId = null;

function playSoundV(type) {
    try {
        if (!audioCtxV) audioCtxV = new AudioContextV();
        const oscillator = audioCtxV.createOscillator();
        const gainNode = audioCtxV.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtxV.destination);
        oscillator.type = 'sine';
        gainNode.gain.value = 0.3;
        
        if (type === 'click') {
            oscillator.frequency.value = 600;
            oscillator.start();
            oscillator.stop(audioCtxV.currentTime + 0.05);
        } else if (type === 'success') {
            oscillator.frequency.value = 880;
            oscillator.start();
            setTimeout(() => {
                const osc2 = audioCtxV.createOscillator();
                const gain2 = audioCtxV.createGain();
                osc2.connect(gain2);
                gain2.connect(audioCtxV.destination);
                osc2.frequency.value = 1100;
                osc2.type = 'sine';
                gain2.gain.value = 0.3;
                osc2.start();
                osc2.stop(audioCtxV.currentTime + 0.05);
            }, 100);
            oscillator.stop(audioCtxV.currentTime + 0.1);
        } else if (type === 'error') {
            oscillator.frequency.value = 300;
            oscillator.type = 'sawtooth';
            gainNode.gain.value = 0.2;
            oscillator.start();
            oscillator.stop(audioCtxV.currentTime + 0.15);
        }
    } catch(e) {}
}

function showToastV(message, type = 'info') {
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
    playSoundV('click');
    sessionStorage.removeItem('user');
    window.location.href = 'index.html';
}

async function loadVendeur() {
    try {
        const user = JSON.parse(sessionStorage.getItem('user') || '{}');
        document.getElementById('vendeurName').textContent = user.nom || 'Vendeur';
        
        const snapshot = await db.collection('vendeurs')
            .where('nom', '==', user.nom)
            .get();
        
        if (snapshot.empty) {
            document.getElementById('vendeurBoutique').textContent = 'Non trouvé';
            return;
        }
        
        const doc = snapshot.docs[0];
        const data = doc.data();
        vendeurId = doc.id;
        document.getElementById('vendeurBoutique').textContent = data.nom || 'Boutique';
        
        loadBilanVendeur();
        loadCommandesVendeur();
    } catch (error) {
        console.error('Erreur:', error);
    }
}

async function loadBilanVendeur() {
    try {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        
        const snapshot = await db.collection('commandes')
            .where('vendeurId', '==', vendeurId)
            .where('dateCreation', '>=', firstDay)
            .get();
        
        const container = document.getElementById('bilanVendeurContainer');
        
        if (snapshot.empty) {
            container.innerHTML = '<p class="empty-message">Aucune commande ce mois.</p>';
            return;
        }
        
        let totalVentes = 0;
        let totalFrais = 0;
        let livrees = 0;
        let commandes = 0;
        
        snapshot.forEach(doc => {
            const data = doc.data();
            commandes++;
            totalVentes += data.prixTotal || 0;
            totalFrais += data.fraisLivraison || 0;
            if (data.statut === 'Livrée') livrees++;
        });
        
        document.getElementById('vendeurVentes').textContent = `${totalVentes} FCFA`;
        document.getElementById('vendeurCommandes').textContent = commandes;
        
        container.innerHTML = `
            <div class="bilan-result">
                <div class="bilan-stats">
                    <div><strong>💰 Total ventes :</strong> ${totalVentes} FCFA</div>
                    <div><strong>🚚 Frais livraison :</strong> ${totalFrais} FCFA</div>
                    <div><strong>📤 À recevoir :</strong> ${totalVentes - totalFrais} FCFA</div>
                    <div><strong>✅ Livrées :</strong> ${livrees}/${commandes}</div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Erreur bilan vendeur:', error);
    }
}

async function loadCommandesVendeur() {
    try {
        const today = new Date();
        today.setHours(0,0,0,0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const snapshot = await db.collection('commandes')
            .where('vendeurId', '==', vendeurId)
            .where('dateCreation', '>=', today)
            .where('dateCreation', '<', tomorrow)
            .orderBy('dateCreation', 'desc')
            .get();
        
        const container = document.getElementById('commandesVendeurContainer');
        
        if (snapshot.empty) {
            container.innerHTML = '<p class="empty-message">Aucune commande aujourd\'hui.</p>';
            return;
        }
        
        let html = '<div class="list-container">';
        snapshot.forEach(doc => {
            const data = doc.data();
            const statutClass = data.statut === 'Livrée' ? 'statut-livree' : 
                               data.statut === 'À appeler' ? 'statut-appel' : 'statut-attente';
            html += `
                <div class="list-item">
                    <div>
                        <strong>${data.numero}</strong>
                        <br><small>${data.articles ? data.articles.map(a => `${a.quantite}x ${a.nom}`).join(', ') : ''}</small>
                        <br><small>📍 ${data.quartier}, ${data.ville}</small>
                    </div>
                    <div>
                        <span class="commande-statut ${statutClass}">${data.statut}</span>
                        <br><small>${data.prixTotal} FCFA</small>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Erreur chargement commandes vendeur:', error);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const user = sessionStorage.getItem('user');
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    loadVendeur();
});