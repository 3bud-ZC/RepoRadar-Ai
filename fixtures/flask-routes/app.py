from flask import Blueprint, Flask

app = Flask(__name__)
blueprint = Blueprint("api", __name__)

@app.route("/health")
def health():
    return {"ok": True}

@blueprint.route("/reports", methods=["POST"])
def reports():
    return {"ok": True}

