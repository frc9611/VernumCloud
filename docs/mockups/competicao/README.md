# Mockups — a competição na tela da equipe

Desenhos das telas de **Ligar a equipe à competição** (Arena Master + The Blue Alliance, Nexus e
FTC), feitos antes da implementação.

Ao contrário dos mockups da pasta acima, que são imagens do designer, estes são **HTML apontando
para o `src/assets/vernum.css` de verdade**. O motivo é prático: um desenho feito fora do sistema de
design promete o que a implementação não entrega, e foi exatamente assim que apareceu, ainda no
mockup, que `--vc-purple-soft` nunca é redefinido no tema escuro — o realce de "esta é a nossa
aliança" viraria um bloco branco ofuscante na TV. No mural ele é um anel roxo por causa disso.

| Arquivo | O que mostra |
|---|---|
| `1-aba-competicao.html` | a aba com **um** evento: próxima partida com a aliança, classificação, partidas |
| `2-aba-dois-eventos.html` | **dois** eventos em cartaz; a aba vira "Competição" e o topo diz de qual evento é a próxima partida |
| `3-mural-tv.html` | o painel no mural, em 1920×1080, legível do outro lado da sala |
| `4-competicao-tela.html` | `/competicao`: em cartaz, sugestões, destaque, prêmios para importar e histórico por temporada |
| `5-cartao-home.html` | a seção compacta na Home |

`_shell.css` é só o cabeçalho e a largura da página, que a aplicação já tem de outro jeito.
`_comp.css` é o desenho da competição em si — é ele que vira o `<style scoped>` do componente.

Para regerar os PNG:

```bash
cd ~/VernumCloud/docs/mockups/competicao
for f in 1-aba-competicao 2-aba-dois-eventos 4-competicao-tela 5-cartao-home; do
  google-chrome-stable --headless --disable-gpu --no-sandbox --hide-scrollbars \
    --window-size=1400,1560 --screenshot="$f.png" "$f.html"
done
google-chrome-stable --headless --disable-gpu --no-sandbox --hide-scrollbars \
  --window-size=1920,1080 --screenshot=3-mural-tv.png 3-mural-tv.html
```
