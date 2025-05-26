// flask_gps_ponto/static/script.js

// ✅ Função global para abrir mapa externo no Google Maps
function abrirMapa(lat, lon) {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
    window.open(url, "_blank");
}

// ✅ Função: exibir mapa na lateral
function exibirMapaLateral(lat, lon) {
    const mapaLateral = document.getElementById('mapa-lateral');
    if (mapaLateral) {
        mapaLateral.innerHTML = `
            <iframe
                width="100%"
                height="300"
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
                <button class="btn btn-sm btn-danger ms-2" onclick="fecharMapaLateral()">Fechar</button>
            </div>
        `;
        mapaLateral.style.display = 'block';
    }
}

// ✅ Função para fechar o mapa lateral
function fecharMapaLateral() {
    const mapaLateral = document.getElementById('mapa-lateral');
    if (mapaLateral) {
        mapaLateral.style.display = 'none';
        mapaLateral.innerHTML = '';
    }
}

// ✅ Execução automática apenas para página de registro
window.onload = function () {
    const latitudeInput = document.getElementById("latitude");
    const longitudeInput = document.getElementById("longitude");
    const coordenadasDiv = document.getElementById("coordenadas");
    const mapaDiv = document.getElementById("mapa-localizacao");

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
                    console.log("✅ Localização detectada e atualizada.");
                },
                function (error) {
                    coordenadasDiv.innerHTML = "❌ Não foi possível obter sua localização.";
                    if (mapaDiv) mapaDiv.innerHTML = "";
                    console.error("❌ Erro ao obter localização:", error);
                }
            );
        } else {
            coordenadasDiv.innerHTML = "⚠️ Geolocalização não suportada neste navegador.";
            if (mapaDiv) mapaDiv.innerHTML = "";
            console.warn("⚠️ Geolocalização não suportada.");
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
