// flask_gps_ponto/static/script.js

// ✅ Função global para abrir mapa externo no Google Maps
function abrirMapa(lat, lon) {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
    window.open(url, "_blank");
}

// ✅ Função para fechar o modal do mapa
function fecharMapa() {
    const modal = document.getElementById('mapa-modal');
    const mapaDiv = document.getElementById('mapa-localizacao');
    if (modal && mapaDiv) {
        modal.style.display = 'none';
        mapaDiv.innerHTML = ""; // limpa o iframe anterior
    }
}

// ✅ Função para exibir o modal do mapa com localização
function exibirMapaModal(lat, lon) {
    const modal = document.getElementById('mapa-modal');
    const mapaDiv = document.getElementById('mapa-localizacao');
    if (modal && mapaDiv) {
        mapaDiv.innerHTML = `
            <iframe
                width="100%"
                height="350"
                style="border:0; border-radius:10px;"
                loading="lazy"
                allowfullscreen
                referrerpolicy="no-referrer-when-downgrade"
                src="https://www.google.com/maps?q=${lat},${lon}&hl=pt-BR&z=16&output=embed">
            </iframe>
            <div class="text-end mt-2">
                <a href="https://www.google.com/maps/search/?api=1&query=${lat},${lon}" target="_blank" class="btn btn-sm btn-outline-primary">
                    🔍 Abrir no Google Maps
                </a>
            </div>
        `;
        modal.style.display = 'flex';
    }
}

// ✅ Execução automática somente se for página com geolocalização (registro de ponto)
window.onload = function () {
    const latitudeInput = document.getElementById("latitude");
    const longitudeInput = document.getElementById("longitude");
    const coordenadasDiv = document.getElementById("coordenadas");
    const mapaDiv = document.getElementById("mapa-localizacao");

    // ✅ Executa localização apenas se existirem elementos típicos da tela de registro
    if (latitudeInput && longitudeInput && coordenadasDiv) {
        function atualizarMapa(lat, lon) {
            if (mapaDiv) {
                mapaDiv.innerHTML = `
                    <div style="margin-top: 15px;">
                        <iframe
                            width="100%"
                            height="250"
                            style="border:0; border-radius:10px;"
                            loading="lazy"
                            allowfullscreen
                            referrerpolicy="no-referrer-when-downgrade"
                            src="https://www.google.com/maps?q=${lat},${lon}&hl=pt-BR&z=16&output=embed">
                        </iframe>
                        <div style="text-align:right; margin-top:5px;">
                            <a href="https://www.google.com/maps/search/?api=1&query=${lat},${lon}" target="_blank" class="btn btn-sm btn-outline-primary">
                                🔍 Abrir no Google Maps
                            </a>
                        </div>
                    </div>
                `;
            }
        }

        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                function (position) {
                    const lat = position.coords.latitude.toFixed(6);
                    const lon = position.coords.longitude.toFixed(6);

                    latitudeInput.value = lat;
                    longitudeInput.value = lon;

                    coordenadasDiv.innerHTML = `
                        📌 <strong>Localização detectada:</strong><br>
                        Latitude: <code>${lat}</code><br>
                        Longitude: <code>${lon}</code>
                    `;

                    atualizarMapa(lat, lon);
                },
                function (error) {
                    coordenadasDiv.innerHTML = "❌ Não foi possível obter sua localização.";
                    if (mapaDiv) mapaDiv.innerHTML = "";
                    console.error("Erro ao obter localização:", error);
                }
            );
        } else {
            coordenadasDiv.innerHTML = "⚠️ Geolocalização não suportada neste navegador.";
            if (mapaDiv) mapaDiv.innerHTML = "";
        }
    }

    // ✅ Registro do Service Worker para PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then(function (registration) {
                console.log("✅ Service Worker registrado com sucesso:", registration.scope);
            })
            .catch(function (error) {
                console.log("❌ Falha ao registrar Service Worker:", error);
            });
    }
};
