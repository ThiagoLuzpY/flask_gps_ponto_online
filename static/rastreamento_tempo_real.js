// flask_gps_ponto/static/rastreamento_tempo_real.js

const OPENCAGE_API_KEY = "c9aac9c2ac4b468fbd700c9dc1489763";

function inicializarMapaTempoReal(ultimoPonto) {
    const mapaTempoReal = L.map('mapaTempoReal').setView([ultimoPonto.lat, ultimoPonto.lng], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapaTempoReal);

    obterEndereco(ultimoPonto.lat, ultimoPonto.lng)
        .then(endereco => {
            let hora = 'Sem horário registrado';

            if (ultimoPonto.timestamp) {
                // ✅ Ajuste para evitar Invalid Date - garante formato ISO
                const timestampFormatado = ultimoPonto.timestamp.replace(' ', 'T').replace('Z', '');
                const dataObj = new Date(timestampFormatado);
                if (!isNaN(dataObj)) {
                    hora = dataObj.toLocaleTimeString();
                } else {
                    console.warn("⚠️ Timestamp inválido:", ultimoPonto.timestamp);
                }
            }

            const info = `Última posição registrada<br>
                Latitude: ${ultimoPonto.lat}<br>
                Longitude: ${ultimoPonto.lng}<br>
                Último horário online: ${hora}<br>
                Endereço: ${endereco}`;

            L.marker([ultimoPonto.lat, ultimoPonto.lng])
                .addTo(mapaTempoReal)
                .bindPopup(info)
                .openPopup();

            document.getElementById('infoTempoReal').innerHTML = `
                <strong>Último horário online:</strong> ${hora}<br>
                <strong>Endereço:</strong> ${endereco}
            `;
        })
        .catch(err => {
            console.error("❌ Erro ao obter endereço:", err);
            document.getElementById('infoTempoReal').innerText = "Erro ao obter endereço.";
        });

    mapaTempoReal.panTo([ultimoPonto.lat, ultimoPonto.lng]);
}

function obterEndereco(lat, lng) {
    const url = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${OPENCAGE_API_KEY}&language=pt&pretty=1`;
    return fetch(url)
        .then(res => res.json())
        .then(data => {
            if (data.results.length > 0) {
                return data.results[0].formatted;
            } else {
                return "Endereço não encontrado";
            }
        });
}

document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 Inicializando mapa tempo real (último ponto)...");

    if (typeof pontos !== 'undefined' && pontos.length > 0) {
        const ultimoPonto = pontos[pontos.length - 1];
        console.log("✅ Último ponto:", ultimoPonto);

        inicializarMapaTempoReal(ultimoPonto);
    } else {
        console.warn("⚠️ Nenhum ponto encontrado para exibição.");
        document.getElementById('infoTempoReal').innerText = "Nenhum ponto encontrado para exibição.";
    }
});
