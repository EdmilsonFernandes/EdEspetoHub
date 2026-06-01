# Plano de qualidade geografica: CEP, endereco, latitude e longitude

Este plano registra a estrategia do Ja no Caminho para tornar distancias, rotas e atendimento por chale/servico confiaveis sem depender inicialmente de APIs pagas.

## Objetivo

Garantir que chales, pousadas, servicos, restaurantes e lojas tenham localizacao coerente o suficiente para:

- mostrar distancia com credibilidade para o usuario final;
- gerar link de rota util para restaurante, servico e motoboy;
- evitar que um CEP generico da cidade vire um ponto exato falso;
- preparar monetizacao por destaque, proximidade e atendimento de hospedagens;
- manter custo baixo enquanto o projeto ainda esta em fase startup.

## Diagnostico atual

O problema principal nao e apenas `lat`/`lng` vazio. Existem muitos registros com coordenadas preenchidas, mas usando o mesmo ponto generico da cidade/destino.

Exemplos observados no banco local:

- muitos registros de Goncalves usam exatamente `-22.6545000, -45.8556000`;
- muitos registros de Sao Bento do Sapucai usam exatamente `-22.6874246, -45.7319876`;
- varios registros de chales e servicos nao possuem CEP, mesmo com coordenada preenchida;
- o backfill atual corrige apenas registros com `lat`/`lng` nulos, entao nao detecta coordenadas genericas ja salvas.

Isso cria uma falsa sensacao de precisao: o app consegue calcular uma distancia, mas essa distancia pode representar o centro da cidade, nao o endereco real.

## Regra principal

Nao salvar fallback de cidade como coordenada precisa.

Se o sistema precisar usar coordenada aproximada, ela deve ser marcada como aproximada. A interface deve tratar esse caso de forma diferente, sem vender aquilo como rota exata.

## Estrategia sem custo pago por padrao

Por enquanto, nao usar Google Maps Platform, Mapbox pago, HERE pago ou qualquer API paga como dependencia obrigatoria.

Permitido:

- CEP via provedores gratuitos ja existentes no projeto;
- OpenStreetMap/Nominatim com respeito a rate limit;
- Photon/Komoot como fallback gratuito de busca por nome/endereco, com cache e uso moderado;
- Geoapify ou LocationIQ como fallback opcional por chave de API em `env`, respeitando free tier/atribuicao/limite de cada provedor;
- bibliotecas/SDKs open source ou gratuitas para mapa, mascara, validacao e UX;
- selecao manual de pin no mapa;
- cache local/persistente para evitar chamadas repetidas;
- links universais para Google Maps/Waze sem API key quando for apenas abrir rota externa.

Opcional futuro, somente com aprovacao:

- Google Geocoding;
- Google Places Autocomplete;
- Google Address Validation;
- Google Routes/Distance Matrix.

Se qualquer provedor pago for adicionado no futuro, deve ficar atras de `env`/feature flag, com limite de uso, fallback gratuito e documentacao de custo.

## Cadeia atual de geocoding

O backend usa `GeoLocationService` como ponto unico de geocoding. A ordem padrao e:

```text
geoapify -> locationiq -> photon -> openstreetmap
```

Regras:

- `Geoapify` so roda quando `GEOAPIFY_API_KEY` estiver configurada.
- `LocationIQ` so roda quando `LOCATIONIQ_API_KEY` estiver configurada.
- `Photon` fica habilitado por padrao como fallback gratuito, mas pode ser desligado com `ENABLE_PHOTON_GEOCODING_FALLBACK=false`.
- `OpenStreetMap/Nominatim` continua como fallback final e pode ser desligado com `ENABLE_OPENSTREETMAP_GEOCODING_FALLBACK=false`.
- `GEOCODING_PROVIDER_ORDER` permite trocar a ordem sem alterar codigo.
- `GEOCODING_PROVIDER_TIMEOUT_MS` controla timeout por chamada externa.
- Todo resultado passa por limite geografico aproximado do Brasil antes de ser aceito.
- O cache em memoria evita repetir chamadas identicas no mesmo processo.

Mesmo com varios provedores gratuitos, endereco rural/turistico com CEP amplo pode continuar impreciso. Nesses casos, o caminho correto e o Super Admin ou parceiro confirmar o pin manualmente.

## Modelo de confianca recomendado

Adicionar metadados de qualidade junto de `lat`/`lng` para chales, servicos/restaurantes e lojas.

Campos sugeridos:

```text
geo_source:
  manual_pin
  geocoder
  zip_code
  city_fallback
  imported
  unknown

geo_precision:
  exact
  street
  zip
  city
  unknown

geo_verified:
  true/false

geocoded_at
formatted_address
```

Interpretacao:

- `manual_pin + exact + verified`: melhor caso; pode mostrar rota e tempo com maior confianca.
- `geocoder + street`: aceitavel, mas ainda pode pedir revisao visual.
- `zip_code`: aproximado; bom para triagem, ruim para rota final em cidade pequena.
- `city_fallback`: apenas fallback visual; nao deve ser usado como distancia precisa.

## Ordem de implementacao

### Fase 0: corrigir bug atual antes de feature nova

Antes de mudar arquitetura, corrigir bugs pontuais que estejam fazendo cadastro salvar coordenada errada ou manter coordenada antiga quando CEP/endereco mudam.

Validar principalmente:

- cadastro/edicao de chale;
- cadastro/edicao de servico/restaurante;
- cadastro/edicao de loja;
- troca de endereco de cliente;
- tela de rota entre servico e hospedagem.

### Fase 1: diagnostico e relatorio

Criar relatorio seguro no Super Admin ou script SQL para encontrar:

- registros sem CEP;
- registros sem numero;
- registros com `lat`/`lng` nulos;
- registros com coordenada igual ao destino/cidade;
- grupos grandes com mesma coordenada;
- registros cujo CEP pertence a cidade/estado diferente do destino;
- registros com endereco alterado mas coordenada nao revalidada.

Essa fase nao deve sobrescrever coordenadas automaticamente.

### Fase 2: metadados de qualidade

Adicionar campos de qualidade geografica nas entidades necessarias e atualizar docs de schema.

Entidades provaveis:

- `hospitality_places`;
- `destination_listings`;
- `store_settings`;
- possivelmente `customer_addresses`, se o mesmo padrao for aplicado ao cliente.

### Fase 3: resolver endereco com pin manual

Nas telas de Super Admin e Portal do Parceiro:

1. usuario informa CEP;
2. sistema preenche endereco quando possivel;
3. usuario completa numero/bairro;
4. sistema sugere coordenada;
5. usuario confirma em mapa ou ajusta pin;
6. somente apos confirmacao salvar como `manual_pin/exact/verified`.

Esse fluxo segue a logica de produto usada por apps maduros: o endereco textual ajuda, mas a confirmacao visual do ponto e o que da confianca.

### Fase 4: backfill controlado

Criar novo backfill com `dry-run` obrigatorio.

Ele deve:

- identificar coordenadas genericas;
- tentar resolver novamente somente quando houver endereco suficiente;
- nunca trocar coordenada precisa por coordenada pior;
- registrar motivo da decisao;
- gerar relatorio antes de aplicar.

Aplicar em producao somente com backup e revisao.

### Fase 5: UX publica de rota/distancia

Na tela do usuario final:

- se os dois pontos forem confiaveis, mostrar rota, distancia e tempo normalmente;
- se algum ponto for aproximado, mostrar texto claro: `Localizacao aproximada`;
- nao mostrar estimativa de minutos como se fosse precisa quando a fonte for `city_fallback`;
- manter botao de abrir Google Maps/Waze quando houver endereco textual suficiente.

## Testes esperados

Backend:

- CEP valido preenche endereco sem sobrescrever coordenada manual confirmada;
- alteracao de CEP/endereco invalida a coordenada antiga quando nao ha `lat/lng` manual;
- fallback de cidade salva `geo_precision = city`, nao `exact`;
- backfill em `dry-run` identifica clusters de mesma coordenada;
- rota nao retorna estimativa precisa quando coordenada e aproximada.

Frontend:

- formulario mostra status de qualidade da localizacao;
- pin confirmado muda status para localizacao verificada;
- tela publica exibe aviso quando ponto e aproximado;
- fluxo mobile nao bloqueia cadastro se CEP nao resolve, mas exige confirmacao manual quando necessario.

## Decisao atual

Manter custo zero como padrao.

Nao implementar API paga agora. A prioridade e corrigir bug, registrar qualidade da coordenada, melhorar UX de confirmacao manual e limpar dados ruins com backfill controlado.

## Implementado inicialmente

- Metadados `geo_source`, `geo_precision`, `geo_verified`, `geocoded_at` e `formatted_address` foram adicionados para `hospitality_places`, `destination_listings`, `store_settings` e `customer_addresses`.
- Edicao de CEP/endereco no Super Admin de destinos limpa `lat`/`lng` antigos para o backend resolver novamente.
- Backend ignora coordenadas antigas reenviadas quando o endereco/CEP muda e classifica a origem da coordenada como `manual_pin`, `geocoder`, `zip_code`, `city_fallback` ou `unknown`.
- Rotas publicas de hospedagem/servico recebem `geoApproximate` e evitam vender tempo estimado como preciso quando algum ponto e aproximado.
- Backfill `backend/src/scripts/backfillDestinationCoordinates.ts` continua controlado por dry-run por padrao e agora tambem identifica registros com coordenada generica igual ao destino ou precisao aproximada.
- Geocoding de destinos agora prioriza endereco completo sem CEP primeiro, incluindo rua, numero, bairro, cidade, UF e Brasil. O CEP entra depois como apoio, para evitar que CEP amplo de cidade turistica force o ponto para o centro da cidade.
- A tela publica de rota nao exibe alerta tecnico para usuario final quando a coordenada e aproximada; ela abre Google Maps/Waze com o endereco completo e so mostra mapa/distancia interna quando a coordenada e confiavel.
- O geocoding do backend agora suporta fallback por Geoapify, LocationIQ, Photon e OpenStreetMap, com provedores comerciais somente quando a chave estiver configurada em `env`.
