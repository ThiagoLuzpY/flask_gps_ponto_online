const OPENCAGE_API_KEY = "c9aac9c2ac4b468fbd700c9dc1489763";

let marcadorTempoReal = null;
let ultimoID = null;
let statusAtual = "offline";

function inicializarMapaTempoReal(ultimoPonto) {
    ultimoID = ultimoPonto.id; // Armazenar o último ID

    const mapaTempoReal = L.map('mapaTempoReal').setView([ultimoPonto.lat, ultimoPonto.lng], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapaTempoReal);

    marcadorTempoReal = L.circleMarker([ultimoPonto.lat, ultimoPonto.lng], {
        radius: 10,
        color: 'red',
        fillColor: '#f03',
        fillOpacity: 0.5
    }).addTo(mapaTempoReal);

    atualizarPopup(ultimoPonto, "offline");

    setInterval(() => checarStatus(ultimoPonto, mapaTempoReal), 15000);

    mapaTempoReal.panTo([ultimoPonto.lat, ultimoPonto.lng]);
}

function atualizarPopup(ponto, status) {
    obterEndereco(ponto.lat, ponto.lng).then(endereco => {
        const hora = ponto.timestamp
            ? new Date(ponto.timestamp).toLocaleString('pt-BR')
            : "Sem horário registrado";

        const info = `Última posição registrada<br>
            Latitude: ${ponto.lat}<br>
            Longitude: ${ponto.lng}<br>
            Último horário online: ${hora}<br>
            Status: <strong style="color: ${status === 'online' ? 'green' : 'red'}">${status}</strong><br>
            Endereço: ${endereco}`;

        marcadorTempoReal.bindPopup(info).openPopup();

        document.getElementById('infoTempoReal').innerHTML = `
            <strong>Último horário online:</strong> ${hora}<br>
            <strong>Status:</strong> <span style="color: ${status === 'online' ? 'green' : 'red'}">${status}</span><br>
            <strong>Endereço:</strong> ${endereco}
        `;
    });
}

function checarStatus(ponto, mapa) {
    fetch(`/status_online?funcionario_id=${ponto.funcionario_id}&ultimo_id=${ultimoID}`)
        .then(res => res.json())
        .then(data => {
            if (data.status !== statusAtual) {
                statusAtual = data.status;
                marcadorTempoReal.setStyle({
                    fillColor: statusAtual === 'online' ? 'green' : 'red',
                    color: statusAtual === 'online' ? 'green' : 'red'
                });
                atualizarPopup(ponto, statusAtual);
            }
            ultimoID = data.ultimo_id;
        })
        .catch(err => console.error("❌ Erro ao checar status:", err));
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
    console.log("🚀 Inicializando mapa tempo real com status...");

    if (typeof pontos !== 'undefined' && pontos.length > 0) {
        const ultimoPonto = pontos[pontos.length - 1];
        ultimoPonto.funcionario_id = parseInt(new URLSearchParams(window.location.search).get('funcionario_id'));
        ultimoPonto.id = ultimoPonto.id || 0; // Garantia

        inicializarMapaTempoReal(ultimoPonto);
    } else {
        console.warn("⚠️ Nenhum ponto encontrado para exibição.");
        document.getElementById('infoTempoReal').innerText = "Nenhum ponto encontrado para exibição.";
    }
});
