# Today UX Plan

## Direção

O `Today` deve funcionar como painel de comando: primeiro mostra estado e próxima ação, depois oferece logs rápidos. A referência de mercado é a combinação de resumo claro, anéis/tiles de progresso e check-in de baixo atrito.

## Alterado neste bloco

- Adicionado `TodayCommand`, um resumo acima dos cards com missão, hábito, água e proteína.
- Adicionados círculos animados inspirados no Apple Fitness para missão, hábito e água.
- Adicionada entrada fluida dos tiles com motion em CSS, sem nova dependência.
- Refinado o visual dos círculos: menos brilho, anéis menores, trilhas discretas e enquadramento responsivo.
- Removido excesso de texto do bloco de atividade para deixá-lo mais próximo do Apple Fitness.
- Padronizados os cards abaixo como tiles escuros, com superfície neutra e profundidade sutil.
- Ajustada animação dos anéis para desenhar progressivamente com `pathLength`, evitando salto visual.
- Anéis agora reanimam quando missão/hábito/água mudam.
- Missão e Água passaram para linguagem de RPG/MMO: quest, EXP, poções e elixir.
- Ícones dos cards principais foram ampliados para presença visual mais clara.
- Check-in da noite virou fechamento de dungeon com humor, recompensa prevista, quest principal e registro da campanha.
- Adicionada tela pós-check-in com resultado da dungeon, EXP, status, streak e retorno ao Today.
- Badge visual dos círculos só mostra `Concluído` quando missão, hábito e água estiverem completos.
- Estado `Dia fechado` no Today virou card permanente de campanha encerrada.
- Criado foco textual dinâmico para orientar a próxima ação do usuário.
- Mantido o fluxo atual de missão, hábito, água, peso, check-in e IA.
- Removido letter-spacing negativo/positivo nos principais títulos do `Today`.

## Próximos blocos sugeridos

- Adicionar estado de "manhã / tarde / noite" com prioridades diferentes.
- Mostrar "próxima melhor ação" vindo da Woolves IA quando houver dados suficientes.
- Criar widgets pequenos para treino, sono e gasto do dia no `Today`.
- Adicionar estados vazios melhores para usuário novo.
