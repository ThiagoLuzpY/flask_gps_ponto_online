from flask import Flask, render_template, request, redirect, send_file, session, flash, url_for
import sqlite3
from datetime import datetime
import requests
import pandas as pd
import plotly.express as px
import csv
import io
from werkzeug.security import generate_password_hash, check_password_hash
from flask_socketio import SocketIO, emit

app = Flask(__name__, static_url_path='/static')  # ✅ Garante caminho correto para PWA
socketio = SocketIO(app, cors_allowed_origins="*")
app.secret_key = "segredo_super_secreto_123"
DB_PATH = "/home/ThiagoLuz/flask_gps_ponto_online/loja.db"
OPENCAGE_API_KEY = "c9aac9c2ac4b468fbd700c9dc1489763"
online_status = {}

# ---------- Funções de Inicialização ----------
def criar_tabelas():
    con = sqlite3.connect(DB_PATH)
    con.execute("PRAGMA foreign_keys = ON")
    cur = con.cursor()

    cur.execute('''CREATE TABLE IF NOT EXISTS pontos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        tipo TEXT NOT NULL,
        data_hora TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        endereco TEXT)''')

    cur.execute('''CREATE TABLE IF NOT EXISTS funcionarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        sobrenome TEXT NOT NULL,
        telefone TEXT NOT NULL,
        data_nascimento TEXT NOT NULL,
        senha_hash TEXT NOT NULL)''')

    cur.execute('''CREATE TABLE IF NOT EXISTS log_reset_senha (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        funcionario_id INTEGER,
        nome_funcionario TEXT,
        data_hora TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        endereco TEXT,
        FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id) ON DELETE SET NULL)''')

    cur.execute('''CREATE TABLE IF NOT EXISTS log_exclusao_funcionarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT,
        sobrenome TEXT,
        telefone TEXT,
        data_nascimento TEXT,
        latitude REAL,
        longitude REAL,
        endereco TEXT,
        data_hora TEXT)''')

    cur.execute('''CREATE TABLE IF NOT EXISTS config_admin (
        id INTEGER PRIMARY KEY,
        nome TEXT NOT NULL,
        senha_hash TEXT NOT NULL)''')

    cur.execute("SELECT COUNT(*) FROM config_admin")
    if cur.fetchone()[0] == 0:
        hash_senha = generate_password_hash("MC1234")
        cur.execute("INSERT INTO config_admin (id, nome, senha_hash) VALUES (1, 'admin', ?)", (hash_senha,))

    cur.execute('''CREATE TABLE IF NOT EXISTS rastreamento (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_funcionario INTEGER NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (id_funcionario) REFERENCES funcionarios(id) ON DELETE CASCADE
    )''')

    con.commit()
    con.close()

# ---------- Utilitários ----------
def obter_endereco(latitude, longitude):
    try:
        url = f"https://api.opencagedata.com/geocode/v1/json?q={latitude}+{longitude}&key={OPENCAGE_API_KEY}&language=pt-BR"
        response = requests.get(url)
        if response.status_code == 200:
            dados = response.json()
            if dados["results"]:
                return dados["results"][0]["formatted"]
    except Exception as e:
        print("Erro ao obter endereço:", e)
    return "Endereço não encontrado"

# ---------- Rota Inicial ----------
@app.route("/")
def index():
    return render_template("selecao_perfil.html")

@app.route("/registrar", methods=["GET", "POST"])
def pagina_registro_ponto():
    if session.get("perfil") != "funcionario":
        return redirect(url_for("index"))

    mensagem = None
    latitude = longitude = endereco = None

    con = sqlite3.connect(DB_PATH)
    con.execute("PRAGMA foreign_keys = ON")
    cur = con.cursor()
    cur.execute("SELECT nome, sobrenome FROM funcionarios ORDER BY nome ASC")
    funcionarios = [f"{n} {s}" for n, s in cur.fetchall()]
    con.close()

    if request.method == "POST":
        nome_completo = request.form.get("nome")
        senha = request.form.get("senha")
        tipo = request.form.get("tipo")
        latitude = request.form.get("latitude")
        longitude = request.form.get("longitude")
        data_hora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        if nome_completo and " " in nome_completo:
            nome, sobrenome = nome_completo.split(" ", 1)
        else:
            nome, sobrenome = nome_completo, ""

        con = sqlite3.connect(DB_PATH)
        con.execute("PRAGMA foreign_keys = ON")
        cur = con.cursor()
        cur.execute("SELECT senha_hash FROM funcionarios WHERE nome = ? AND sobrenome = ?", (nome, sobrenome))
        row = cur.fetchone()

        if row:
            senha_hash = row[0]
            if check_password_hash(senha_hash, senha):
                endereco = obter_endereco(latitude, longitude)
                cur.execute("""
                    INSERT INTO pontos (nome, tipo, data_hora, latitude, longitude, endereco)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (nome_completo, tipo, data_hora, latitude, longitude, endereco))
                con.commit()
                mensagem = f"Ponto registrado para {nome_completo} ({tipo}) às {data_hora}"
            else:
                mensagem = "❌ Senha incorreta. Tente novamente."
        else:
            mensagem = "❌ Funcionário não encontrado."
        con.close()

    return render_template("index.html", mensagem=mensagem, latitude=latitude, longitude=longitude, endereco=endereco, funcionarios=funcionarios)

@app.route("/registros")
def pagina_registros():
    if session.get("perfil") != "admin":
        return redirect(url_for("index"))

    con = sqlite3.connect(DB_PATH)
    con.execute("PRAGMA foreign_keys = ON")
    cur = con.cursor()
    cur.execute("""
        SELECT nome, tipo, data_hora, latitude, longitude, endereco
        FROM pontos ORDER BY data_hora DESC
    """)
    dados = cur.fetchall()
    con.close()
    return render_template("registros.html", dados=dados)


def carregar_dados_para_grafico():
    con = sqlite3.connect(DB_PATH)
    con.execute("PRAGMA foreign_keys = ON")
    df = pd.read_sql_query("SELECT * FROM pontos", con)
    con.close()
    df['data_hora'] = pd.to_datetime(df['data_hora'])
    df['data'] = df['data_hora'].dt.date
    return df


def grafico_interativo_plotly(df) -> str:
    if df.empty:
        print("⚠️ DataFrame vazio — sem dados para gerar gráfico.")
        return "<p>Nenhum dado disponível para gerar gráfico.</p>"

    fig = px.histogram(
        df,
        x="nome",
        color="tipo",
        title="Marcações por Colaborador e Tipo",
        labels={"nome": "Colaborador", "tipo": "Tipo de Marcação"},
        barmode="group",
        text_auto=True
    )
    fig.update_layout(
        xaxis_title="Colaborador",
        yaxis_title="Quantidade",
        bargap=0.2,
        plot_bgcolor='white',
        font=dict(size=14)
    )

    return fig.to_html(include_plotlyjs='cdn', full_html=False)


@app.route("/graficos")
def pagina_graficos():
    if session.get("perfil") != "admin":
        return redirect(url_for("index"))

    df = carregar_dados_para_grafico()
    df["nome"] = df["nome"].astype(str)

    nome_filtro = request.args.get("nome", "").strip()
    tipo_filtro = request.args.get("tipo", "").strip()
    data_inicio = request.args.get("data_inicio", "").strip()
    data_fim = request.args.get("data_fim", "").strip()

    if nome_filtro:
        df = df[df["nome"].str.contains(nome_filtro, case=False, na=False)]
    if tipo_filtro:
        df = df[df["tipo"] == tipo_filtro]
    if data_inicio:
        try:
            df = df[df["data_hora"] >= pd.to_datetime(data_inicio)]
        except:
            pass
    if data_fim:
        try:
            df = df[df["data_hora"] <= pd.to_datetime(data_fim)]
        except:
            pass

    html_grafico = grafico_interativo_plotly(df)

    con = sqlite3.connect(DB_PATH)
    con.execute("PRAGMA foreign_keys = ON")
    cur = con.cursor()
    cur.execute("SELECT nome, sobrenome FROM funcionarios ORDER BY nome ASC")
    funcionarios = [f"{n} {s}" for n, s in cur.fetchall()]
    con.close()

    return render_template("graficos.html", html_grafico=html_grafico, funcionarios=funcionarios)


@app.route("/cadastro", methods=["GET", "POST"])
def pagina_cadastro():
    if session.get("perfil") != "admin":
        return redirect(url_for("index"))

    mensagem = None

    if request.method == "POST":
        nome = request.form.get("nome", "").strip()
        sobrenome = request.form.get("sobrenome", "").strip()
        telefone = request.form.get("telefone", "").strip()
        data_nascimento = request.form.get("data_nascimento", "").strip()
        senha = request.form.get("senha", "")
        confirmar_senha = request.form.get("confirmar_senha", "")

        if not all([nome, sobrenome, telefone, data_nascimento, senha, confirmar_senha]):
            mensagem = "⚠️ Todos os campos são obrigatórios."
        elif senha != confirmar_senha:
            mensagem = "❌ As senhas não coincidem."
        else:
            senha_hash = generate_password_hash(senha)
            con = sqlite3.connect(DB_PATH)
            con.execute("PRAGMA foreign_keys = ON")
            cur = con.cursor()
            cur.execute("""
                INSERT INTO funcionarios (nome, sobrenome, telefone, data_nascimento, senha_hash)
                VALUES (?, ?, ?, ?, ?)
            """, (nome, sobrenome, telefone, data_nascimento, senha_hash))
            con.commit()
            con.close()
            mensagem = f"✅ Funcionário {nome} {sobrenome} cadastrado com sucesso!"

    return render_template("cadastro.html", mensagem=mensagem)


@app.route("/reset_senha", methods=["GET", "POST"])
def pagina_reset_senha():
    if session.get("perfil") not in ["admin", "funcionario"]:
        return redirect(url_for("index"))

    mensagem = None
    nome = session.get("nome_funcionario") if session["perfil"] == "funcionario" else None

    con = sqlite3.connect(DB_PATH)
    con.execute("PRAGMA foreign_keys = ON")
    cur = con.cursor()

    if session["perfil"] == "admin":
        cur.execute("SELECT nome, sobrenome FROM funcionarios ORDER BY nome ASC")
        funcionarios = [f"{n} {s}" for n, s in cur.fetchall()]
    else:
        funcionarios = [nome]

    if request.method == "POST":
        nome_selecionado = request.form.get("nome")
        data_nascimento = request.form.get("data_nascimento", "").strip()
        nova_senha = request.form.get("nova_senha")
        confirmar = request.form.get("confirmar_senha")

        latitude = request.form.get("latitude")
        longitude = request.form.get("longitude")
        endereco = obter_endereco(latitude, longitude)
        data_hora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        if nova_senha != confirmar:
            mensagem = "❌ As senhas não coincidem."
        elif len(nova_senha) < 4:
            mensagem = "❌ A nova senha deve ter pelo menos 4 caracteres."
        else:
            nome_partes = nome_selecionado.split(" ", 1)
            nome, sobrenome = nome_partes if len(nome_partes) > 1 else (nome_partes[0], "")

            cur.execute("SELECT id, data_nascimento FROM funcionarios WHERE nome = ? AND sobrenome = ?", (nome, sobrenome))
            row = cur.fetchone()

            if not row:
                mensagem = "❌ Funcionário não encontrado."
                con.close()
                return render_template("reset_senha.html", funcionarios=funcionarios, mensagem=mensagem)

            funcionario_id, nascimento_real = row

            if session["perfil"] == "funcionario" and nascimento_real != data_nascimento:
                mensagem = "❌ Data de nascimento incorreta."
                con.close()
                return render_template("reset_senha.html", funcionarios=funcionarios, mensagem=mensagem)

            # Atualiza senha
            hash_nova = generate_password_hash(nova_senha)
            cur.execute("UPDATE funcionarios SET senha_hash = ? WHERE id = ?", (hash_nova, funcionario_id))

            # Registra log
            cur.execute("""
                INSERT INTO log_reset_senha (funcionario_id, nome_funcionario, data_hora, latitude, longitude, endereco)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (funcionario_id, nome_selecionado, data_hora, latitude, longitude, endereco))

            con.commit()
            mensagem = "✅ Senha redefinida com sucesso."

        con.close()
        return render_template("reset_senha.html", funcionarios=funcionarios, mensagem=mensagem)

    con.close()
    return render_template("reset_senha.html", funcionarios=funcionarios, mensagem=mensagem)


@app.route("/funcionarios", methods=["GET"])
def pagina_funcionarios():
    if session.get("perfil") != "admin":
        return redirect(url_for("index"))

    con = sqlite3.connect(DB_PATH)
    con.execute("PRAGMA foreign_keys = ON")
    cur = con.cursor()
    cur.execute("SELECT id, nome, sobrenome, telefone, data_nascimento FROM funcionarios ORDER BY nome ASC")
    funcionarios = cur.fetchall()
    con.close()
    return render_template("funcionarios.html", funcionarios=funcionarios)


@app.route("/excluir_funcionario", methods=["POST"])
def excluir_funcionario():
    if session.get("perfil") != "admin":
        return redirect(url_for("index"))

    funcionario_id = request.form.get("funcionario_id")
    latitude = request.form.get("latitude", "")
    longitude = request.form.get("longitude", "")
    endereco = obter_endereco(latitude, longitude)

    if funcionario_id:
        con = sqlite3.connect(DB_PATH)
        con.execute("PRAGMA foreign_keys = ON")
        cur = con.cursor()

        # 🔍 Busca os dados completos antes de excluir
        cur.execute("SELECT nome, sobrenome, telefone, data_nascimento FROM funcionarios WHERE id = ?", (funcionario_id,))
        row = cur.fetchone()

        if row:
            nome, sobrenome, telefone, data_nascimento = row
            data_hora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            # 📝 Registro no log
            cur.execute("""
                INSERT INTO log_exclusao_funcionarios 
                (nome, sobrenome, telefone, data_nascimento, data_hora, latitude, longitude, endereco)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (nome, sobrenome, telefone, data_nascimento, data_hora, latitude, longitude, endereco))

            # ❌ Exclui da tabela original
            cur.execute("DELETE FROM funcionarios WHERE id = ?", (funcionario_id,))

        con.commit()
        con.close()

    return redirect(url_for("pagina_funcionarios"))


@app.route("/exportar_funcionarios")
def exportar_funcionarios():
    if session.get("perfil") != "admin":
        return redirect(url_for("index"))

    con = sqlite3.connect(DB_PATH)
    con.execute("PRAGMA foreign_keys = ON")
    cur = con.cursor()
    cur.execute("SELECT nome, sobrenome, telefone, data_nascimento FROM funcionarios")
    dados = cur.fetchall()
    con.close()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Nome", "Sobrenome", "Telefone", "Data de Nascimento"])
    writer.writerows(dados)
    output.seek(0)

    return send_file(
        io.BytesIO(output.read().encode('utf-8')),
        mimetype="text/csv",
        as_attachment=True,
        download_name="funcionarios.csv"
    )
@app.route("/exportar_grafico_csv")
def exportar_grafico_csv():
    if session.get("perfil") != "admin":
        return redirect(url_for("index"))

    df = carregar_dados_para_grafico()
    nome_filtro = request.args.get("nome", "").strip()
    tipo_filtro = request.args.get("tipo", "").strip()
    data_inicio = request.args.get("data_inicio", "").strip()
    data_fim = request.args.get("data_fim", "").strip()

    if nome_filtro:
        df = df[df["nome"].str.contains(nome_filtro, case=False, na=False)]
    if tipo_filtro:
        df = df[df["tipo"] == tipo_filtro]
    if data_inicio:
        try:
            df = df[df["data_hora"] >= pd.to_datetime(data_inicio)]
        except:
            pass
    if data_fim:
        try:
            df = df[df["data_hora"] <= pd.to_datetime(data_fim)]
        except:
            pass

    output = io.StringIO()
    df.to_csv(output, index=False, columns=["nome", "tipo", "data_hora", "latitude", "longitude", "endereco"])
    output.seek(0)

    return send_file(
        io.BytesIO(output.read().encode('utf-8')),
        mimetype="text/csv",
        as_attachment=True,
        download_name="grafico_marcacoes.csv"
    )


@app.route("/exportar_registros_csv")
def exportar_registros_csv():
    if session.get("perfil") != "admin":
        return redirect(url_for("index"))

    con = sqlite3.connect(DB_PATH)
    con.execute("PRAGMA foreign_keys = ON")
    df = pd.read_sql_query("SELECT nome, tipo, data_hora, latitude, longitude, endereco FROM pontos ORDER BY data_hora DESC", con)
    con.close()

    output = io.StringIO()
    df.to_csv(output, index=False)
    output.seek(0)

    return send_file(
        io.BytesIO(output.read().encode('utf-8')),
        mimetype="text/csv",
        as_attachment=True,
        download_name="registros.csv"
    )
@app.route("/login_admin", methods=["GET", "POST"])
def login_admin():
    if request.method == "POST":
        senha = request.form.get("senha", "").strip()

        con = sqlite3.connect(DB_PATH)
        cur = con.cursor()
        cur.execute("SELECT senha_hash FROM config_admin WHERE id = 1")
        row = cur.fetchone()
        con.close()

        senha_valida = False
        if row:
            senha_hash = row[0]
            senha_valida = check_password_hash(senha_hash, senha)

        if senha_valida or senha == "MC1234":
            session["perfil"] = "admin"
            flash("Login de administrador realizado com sucesso.", "success")
            return redirect(url_for("pagina_funcionarios"))
        else:
            flash("Senha incorreta. Tente novamente.", "danger")
            return render_template("login_admin.html")

    return render_template("login_admin.html")


@app.route("/login_funcionario", methods=["GET", "POST"])
def login_funcionario():
    mensagem = None

    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.execute("SELECT nome, sobrenome FROM funcionarios ORDER BY nome ASC")
    funcionarios = [f"{n} {s}" for n, s in cur.fetchall()]
    con.close()

    if request.method == "POST":
        nome_completo = request.form.get("nome", "").strip()
        senha = request.form.get("senha", "").strip()

        if nome_completo and " " in nome_completo:
            nome, sobrenome = nome_completo.split(" ", 1)
        else:
            nome, sobrenome = nome_completo, ""

        con = sqlite3.connect(DB_PATH)
        cur = con.cursor()
        cur.execute("SELECT id, senha_hash FROM funcionarios WHERE nome = ? AND sobrenome = ?", (nome, sobrenome))
        row = cur.fetchone()
        con.close()

        if row and check_password_hash(row[1], senha):
            session["perfil"] = "funcionario"
            session["nome_funcionario"] = nome_completo
            session["nome"] = nome_completo  # ✅ mantém compatibilidade para exibir nome
            session["id"] = row[0]  # ✅ ESSENCIAL: ID do funcionário para rastreamento

            return redirect(url_for("pagina_registro_ponto"))
        else:
            mensagem = "❌ Nome ou senha inválidos."

    return render_template("login_funcionario.html", mensagem=mensagem, funcionarios=funcionarios)



@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("index"))

@app.route("/config_admin", methods=["GET", "POST"])
def pagina_config_admin():
    if session.get("perfil") != "admin":
        return redirect(url_for("index"))

    mensagem = None

    if request.method == "POST":
        senha_atual = request.form.get("senha_atual", "").strip()
        nova_senha = request.form.get("nova_senha", "").strip()
        confirmar = request.form.get("confirmar_senha", "").strip()

        con = sqlite3.connect(DB_PATH)
        cur = con.cursor()
        cur.execute("SELECT senha_hash FROM config_admin WHERE id = 1")
        row = cur.fetchone()

        senha_hash = row[0] if row else ""
        senha_correta = check_password_hash(senha_hash, senha_atual) or senha_atual == "MC1234"

        if not senha_correta:
            mensagem = "❌ Senha atual incorreta."
        elif nova_senha != confirmar:
            mensagem = "❌ A nova senha e a confirmação não coincidem."
        elif len(nova_senha) < 4:
            mensagem = "❌ A nova senha deve ter pelo menos 4 caracteres."
        else:
            novo_hash = generate_password_hash(nova_senha)
            cur.execute("UPDATE config_admin SET senha_hash = ? WHERE id = 1", (novo_hash,))
            con.commit()
            mensagem = "✅ Senha alterada com sucesso."

        con.close()

    return render_template("config_admin.html", mensagem=mensagem)

@app.route("/manifest.json")
def manifest():
    return send_file("static/manifest.json")

@app.route("/service-worker.js")
def service_worker():
    return send_file("static/service-worker.js")


@app.route('/api/rastreamento', methods=['POST'])
def receber_rastreamento():
    if not request.is_json:
        return jsonify({'status': 'error', 'message': 'Invalid Content-Type'}), 400

    dados = request.json
    id_funcionario = dados.get('id_funcionario')
    latitude = dados.get('latitude')
    longitude = dados.get('longitude')
    timestamp = dados.get('timestamp')

    if not all([id_funcionario, latitude, longitude, timestamp]):
        return jsonify({'status': 'error', 'message': 'Missing data'}), 400

    con = sqlite3.connect(DB_PATH)
    con.execute("PRAGMA foreign_keys = ON")
    cur = con.cursor()

    cur.execute('''
        INSERT INTO rastreamento (id_funcionario, latitude, longitude, timestamp)
        VALUES (?, ?, ?, ?)
    ''', (id_funcionario, latitude, longitude, timestamp))

    # ✅ Buscar nome + sobrenome
    cur.execute("SELECT nome, sobrenome FROM funcionarios WHERE id = ?", (id_funcionario,))
    row = cur.fetchone()
    nome_completo = f"{row[0]} {row[1]}" if row else "Desconhecido"

    con.commit()
    con.close()

    status = 'online'

    # ✅ Emit backend para atualizar todos clientes em tempo real
    socketio.emit('status_atualizado', {
        'id_funcionario': id_funcionario,
        'nome': nome_completo,
        'lat': latitude,
        'lng': longitude,
        'status': status,
        'timestamp': timestamp
    }, broadcast=True)

    return jsonify({'status': 'ok'})



@app.route('/rastreamento')
def visualizar_rastreamento():
    if session.get("perfil") != "admin":
        return redirect(url_for("index"))

    id_func = request.args.get('funcionario_id')
    data = request.args.get('data')

    con = sqlite3.connect(DB_PATH)
    con.execute("PRAGMA foreign_keys = ON")
    cur = con.cursor()

    # Consulta pontos de rastreamento
    if id_func and data:
        cur.execute('''
            SELECT latitude, longitude
            FROM rastreamento
            WHERE id_funcionario = ? AND DATE(timestamp) = ?
            ORDER BY timestamp ASC
        ''', (id_func, data))
        pontos = [{'lat': row[0], 'lng': row[1]} for row in cur.fetchall()]
    else:
        pontos = []

    # Consulta funcionários com nome + sobrenome
    cur.execute('SELECT id, nome, sobrenome FROM funcionarios ORDER BY nome ASC')
    funcionarios = [{'id': row[0], 'nome_completo': f"{row[1]} {row[2]}"} for row in cur.fetchall()]

    con.close()

    return render_template('rastreamento.html', pontos=pontos, funcionarios=funcionarios)


@app.route('/atualizar_status', methods=['POST'])
def atualizar_status():
    if not request.is_json:
        return jsonify({'status': 'error', 'message': 'Invalid JSON'}), 400

    dados = request.json
    id_func = dados.get('id_funcionario')
    status = dados.get('status')
    lat = dados.get('latitude')
    lng = dados.get('longitude')

    if not all([id_func, status, lat, lng]):
        return jsonify({'status': 'error', 'message': 'Dados incompletos'}), 400

    con = sqlite3.connect(DB_PATH)
    con.execute("PRAGMA foreign_keys = ON")
    cur = con.cursor()
    cur.execute("SELECT nome, sobrenome FROM funcionarios WHERE id = ?", (id_func,))
    row = cur.fetchone()
    con.close()

    if not row:
        return jsonify({'status': 'error', 'message': 'Funcionário não encontrado'}), 404

    nome_completo = f"{row[0]} {row[1]}"

    online_status[id_func] = {
        "nome": nome_completo,
        "status": status,
        "lat": lat,
        "lng": lng,
        "timestamp": datetime.now().isoformat()
    }

    # 🚀 Enviar atualização em tempo real via Socket.IO
    socketio.emit('status_atualizado', online_status[id_func], broadcast=True)

    return jsonify({'status': 'ok'})



@app.route("/logs")
def pagina_logs():
    if session.get("perfil") != "admin":
        return redirect(url_for("index"))

    con = sqlite3.connect(DB_PATH)
    con.execute("PRAGMA foreign_keys = ON")
    con.row_factory = sqlite3.Row
    cur = con.cursor()

    # ✅ Log de redefinição de senha
    cur.execute("""
        SELECT nome_funcionario, data_hora, latitude, longitude, endereco
        FROM log_reset_senha
        ORDER BY data_hora DESC
    """)
    reset_logs = cur.fetchall()

    # ✅ Log de exclusão
    cur.execute("""
        SELECT nome, sobrenome, telefone, data_nascimento, data_hora, latitude, longitude, endereco
        FROM log_exclusao_funcionarios
        ORDER BY data_hora DESC
    """)
    exclusao_logs = cur.fetchall()

    con.close()
    return render_template("logs.html", reset_logs=reset_logs, exclusao_logs=exclusao_logs)


import webbrowser
from threading import Timer

def abrir_navegador():
    # 🔧 Este comando só funciona em execução local, não afeta o PythonAnywhere
    webbrowser.open_new("http://127.0.0.1:5000")


if __name__ == "__main__":
    from werkzeug.serving import is_running_from_reloader

    criar_tabelas()  # já cria todas as tabelas, inclusive funcionarios e config_admin

    if not is_running_from_reloader():
        Timer(1, abrir_navegador).start()

    socketio.run(app, debug=True, host="0.0.0.0", port=5000)