import typer

app = typer.Typer()

@app.command()
def greet() -> None:
    print("hello")
