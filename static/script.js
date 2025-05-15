// flask_gps_ponto/static/script.js

window.onload = function () {
    const latitudeInput = document.getElementById("latitude");
    const longitudeInput = document.getElementById("longitude");
    const coordenadasDiv = document.getElementById("coordenadas");

    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            function (position) {
                const lat = position.coords.latitude.toFixed(6);
                const lon = position.coords.longitude.toFixed(6);

                if (latitudeInput) latitudeInput.value = lat;
                if (longitudeInput) longitudeInput.value = lon;

                if (coordenadasDiv) {
                    coordenadasDiv.innerHTML = `
                        📌 <strong>Localização detectada:</strong><br>
                        Latitude: <code>${lat}</code><br>
                        Longitude: <code>${lon}</code>
                    `;
                }
            },
            function (error) {
                if (coordenadasDiv) {
                    coordenadasDiv.innerHTML = "❌ Não foi possível obter sua localização.";
                }
                console.error("Erro ao obter localização:", error);
            }
        );
    } else {
        if (coordenadasDiv) {
            coordenadasDiv.innerHTML = "⚠️ Geolocalização não suportada neste navegador.";
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
