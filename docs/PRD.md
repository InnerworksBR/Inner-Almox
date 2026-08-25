
Nome do produto: Inner Almox
Empresa responsável: InnerWorks Soluções em Tecnologia
Tipo de produto: Plataforma corporativa white-label de patrimônio, almoxarifado, frota e manutenção
Versão do documento: 1.0
Status: Pronto para início do desenvolvimento
Stack principal: Next.js, TypeScript, Fastify, Supabase, Redis, BullMQ e Docker


 1. Visão do produto
O Inner Almox será uma plataforma corporativa multiempresa e white-label para controle de patrimônio, almoxarifado, frota, garantias, manutenções, documentos e responsabilidades.
A solução será utilizada inicialmente pela InnerWorks para organizar seus próprios ativos, equipamentos, veículos e insumos. Posteriormente, deverá ser disponibilizada para clientes com identidade visual própria, domínio próprio, módulos configuráveis e isolamento completo de dados.
O produto deverá permitir que uma empresa saiba, a qualquer momento:

- Quais ativos possui. 
- Onde cada ativo está. 
- Quem está utilizando cada item. 
- Quais equipamentos estão disponíveis, em uso, emprestados ou em manutenção. 
- Quais garantias estão próximas do vencimento. 
- Quais documentos estão vencendo. 
- Quais itens de estoque estão abaixo do mínimo. 
- Quem retirou determinado material. 
- Qual veículo está com determinado colaborador. 
- Quantos quilômetros foram percorridos. 
- Quanto foi gasto com combustível, manutenção e outros custos. 
- Quais ativos foram localizados em inventário. 
- Quais ativos estão sem responsável ou sem localização. 


 2. Problema a ser resolvido
A empresa possui diversos equipamentos, veículos, documentos e materiais, mas não possui uma plataforma centralizada para acompanhar toda a vida útil desses recursos.
Os principais problemas são:

- Falta de inventário confiável. 
- Equipamentos sem localização conhecida. 
- Equipamentos sem responsável definido. 
- Ausência de histórico de entrega e devolução. 
- Garantias vencendo sem aviso. 
- Manutenções sem acompanhamento. 
- Estoque sem controle de entrada e saída. 
- Falta de rastreabilidade sobre consumo de insumos. 
- Veículos sem histórico consolidado de utilização. 
- Quilometragem e despesas controladas de forma dispersa. 
- Dificuldade de gerar relatórios. 
- Falta de trilha de auditoria. 
- Impossibilidade de reutilizar a solução para outros clientes. 


 3. Objetivo principal
Criar uma plataforma escalável, multi-tenant e white-label que centralize o controle de ativos, materiais, veículos, documentos, garantias, manutenções e movimentações.


 4. Objetivos específicos

- Cadastrar ativos individualizados. 
- Identificar equipamentos por QR Code. 
- Controlar localização e responsável. 
- Registrar entregas, devoluções, empréstimos e transferências. 
- Gerar termos de responsabilidade. 
- Controlar garantias e documentos. 
- Controlar manutenções preventivas e corretivas. 
- Controlar produtos e insumos por quantidade. 
- Registrar entradas, saídas e ajustes. 
- Gerenciar requisições de materiais. 
- Cadastrar veículos e motoristas. 
- Registrar retiradas, devoluções e quilometragem. 
- Registrar abastecimentos e despesas. 
- Controlar documentos e habilitações. 
- Executar inventários. 
- Gerar dashboards e relatórios. 
- Garantir isolamento entre empresas. 
- Permitir personalização visual por cliente. 
- Permitir instalação SaaS ou dedicada. 


 5. Indicadores de sucesso
O produto será considerado funcionalmente bem-sucedido quando permitir:

- Criar um novo tenant sem alteração de código. 
- Personalizar nome, logo, cores e domínio. 
- Cadastrar ativos e gerar QR Code. 
- Consultar localização e responsável. 
- Registrar entrega e devolução. 
- Gerar termo de responsabilidade. 
- Registrar garantia e receber alerta. 
- Criar ordem de manutenção. 
- Cadastrar produto de estoque. 
- Registrar entrada e saída. 
- Criar requisição de material. 
- Cadastrar veículo. 
- Registrar retirada e devolução. 
- Calcular quilômetros percorridos. 
- Registrar abastecimento. 
- Realizar inventário. 
- Exportar relatórios. 
- Garantir que um tenant não acesse dados de outro. 
Indicadores sugeridos:

Indicador	Meta inicial
Disponibilidade mensal	99,5%
Tempo médio de resposta de telas comuns	Até 2 segundos
Tempo de carregamento inicial	Até 3 segundos
Isolamento entre tenants	100%
Operações auditáveis registradas	100%
Cobertura de testes de regras críticas	Mínimo de 80%



 6. Escopo do MVP
6.1 Incluído no MVP

- Multi-tenant. 
- White-label básico. 
- Login com e-mail e senha. 
- Login Microsoft opcional. 
- Gestão de usuários. 
- Perfis de acesso. 
- Filiais. 
- Setores. 
- Centros de custo. 
- Localizações. 
- Fornecedores. 
- Cadastro de ativos. 
- Categorias de ativos. 
- QR Code. 
- Fotos e documentos. 
- Entrega e devolução. 
- Empréstimos. 
- Transferências. 
- Termos de responsabilidade. 
- Garantias. 
- Ordens de manutenção. 
- Manutenção preventiva e corretiva. 
- Produtos de estoque. 
- Entradas e saídas. 
- Transferências de estoque. 
- Estoque mínimo. 
- Requisições de materiais. 
- Cadastro de veículos. 
- Cadastro de motoristas. 
- Retirada e devolução de veículos. 
- Quilometragem. 
- Checklist. 
- Abastecimentos. 
- Despesas. 
- Alertas. 
- Dashboards básicos. 
- Relatórios. 
- Exportação CSV e XLSX. 
- Auditoria. 
- Implantação via Docker. 
6.2 Fora do MVP

- Aplicativo móvel nativo. 
- Leitura NFC. 
- Integração com rastreadores. 
- Telemetria. 
- Integração com cartões de combustível. 
- Integração com ERP. 
- Integração com emissão de nota fiscal. 
- Depreciação contábil completa. 
- Compras e cotações. 
- Portal público de fornecedores. 
- Assinatura eletrônica avançada. 
- OCR de notas fiscais. 
- Inteligência artificial para previsão de estoque. 
- Geolocalização em tempo real. 
- Integração com seguradoras. 
- Integração com Detran. 


 7. Personas e perfis de acesso
7.1 Superadministrador InnerWorks
Responsável pela operação da plataforma.
Permissões:

- Criar tenants. 
- Suspender tenants. 
- Configurar domínios. 
- Definir limites. 
- Habilitar módulos. 
- Gerenciar planos. 
- Ver saúde do sistema. 
- Acessar logs técnicos. 
- Acessar suporte assistido com auditoria. 
7.2 Administrador do tenant
Responsável pelo ambiente do cliente.
Permissões:

- Configurar identidade visual. 
- Gerenciar usuários. 
- Gerenciar filiais. 
- Gerenciar setores. 
- Gerenciar centros de custo. 
- Gerenciar permissões. 
- Consultar relatórios gerais. 
- Configurar integrações. 
7.3 Gestor de patrimônio
Permissões:

- Cadastrar ativos. 
- Editar ativos. 
- Realizar movimentações. 
- Emitir termos. 
- Gerenciar garantias. 
- Executar inventários. 
- Registrar baixas. 
7.4 Almoxarife
Permissões:

- Cadastrar produtos. 
- Registrar entradas. 
- Registrar saídas. 
- Gerenciar lotes. 
- Gerenciar transferências. 
- Separar requisições. 
- Realizar inventários de estoque. 
7.5 Gestor de frota
Permissões:

- Cadastrar veículos. 
- Gerenciar motoristas. 
- Gerenciar reservas. 
- Registrar utilização. 
- Controlar quilometragem. 
- Controlar combustível. 
- Controlar documentos e revisões. 
7.6 Gestor de manutenção
Permissões:

- Abrir ordens de serviço. 
- Registrar diagnósticos. 
- Registrar custos. 
- Programar manutenções preventivas. 
- Acompanhar fornecedores. 
- Encerrar manutenções. 
7.7 Gestor de setor
Permissões:

- Visualizar ativos do próprio setor. 
- Visualizar colaboradores da equipe. 
- Solicitar materiais. 
- Aprovar requisições. 
- Consultar pendências da equipe. 
7.8 Colaborador
Permissões:

- Visualizar ativos sob sua responsabilidade. 
- Aceitar termos. 
- Solicitar materiais. 
- Registrar devolução. 
- Registrar problema. 
- Retirar e devolver veículo. 
- Informar quilometragem. 
- Preencher checklist. 
7.9 Auditor
Permissões:

- Acesso somente para consulta. 
- Visualização de históricos. 
- Visualização de inventários. 
- Visualização de documentos. 
- Exportação de relatórios autorizados. 


 8. Multi-tenant e white-label
Cada empresa cliente será um tenant isolado.
8.1 Configurações por tenant

- Nome empresarial. 
- Nome do produto. 
- Slug. 
- Status. 
- Plano. 
- Limite de usuários. 
- Limite de ativos. 
- Limite de veículos. 
- Limite de armazenamento. 
- Logo. 
- Favicon. 
- Cores. 
- Imagem de login. 
- Domínio. 
- Modelo de termo. 
- Modelo de relatório. 
- Configuração de e-mail. 
- Módulos habilitados. 
- Campos personalizados. 
- Regras de aprovação. 
8.2 Domínios
Exemplos:

almox.innerworks.com.br
patrimonio.cliente-a.com.br
ativos.cliente-b.com.br


 O tenant deverá ser resolvido pelo domínio da requisição.
8.3 Isolamento
Todas as tabelas de negócio deverão possuir tenant_id.
O isolamento deverá ser garantido por:

1. Row-Level Security. 
2. Validação no Fastify. 
3. Controle de interface. 
4. Testes automatizados. 


 9. Autenticação e usuários
9.1 Supabase Auth
O sistema utilizará Supabase Auth para:

- Login por e-mail e senha. 
- Recuperação de senha. 
- Convites. 
- Confirmação de e-mail. 
- Magic Link opcional. 
- Login Microsoft opcional. 
- Sessões. 
9.2 Estrutura recomendada

- profiles: dados globais da pessoa. 
- tenant_memberships: vínculo com empresa. 
- membership_roles: perfis no tenant. 
- departments: setores. 
- branches: filiais. 
- cost_centers: centros de custo. 
- management_relations: relações de gestão. 
9.3 Dados do colaborador

- Nome. 
- E-mail. 
- Matrícula. 
- Telefone. 
- Cargo. 
- Setor. 
- Filial. 
- Centro de custo. 
- Gestor. 
- Data de admissão. 
- Data de desligamento. 
- Status. 
- CNH opcional. 
- Categoria da CNH. 
- Validade da CNH. 
9.4 Formas de cadastro

- Cadastro manual. 
- Convite por e-mail. 
- Importação CSV. 
- Sincronização Microsoft 365. 
- API futura. 


 10. Estrutura organizacional
O sistema deverá permitir:

- Múltiplas filiais. 
- Múltiplos setores. 
- Múltiplos centros de custo. 
- Hierarquia de localizações. 
- Almoxarifados separados. 
- Garagens. 
- Depósitos. 
- Salas. 
- Andares. 
- Estoques independentes. 
Exemplo:

Matriz
├── TI
│   ├── Sala de servidores
│   └── Almoxarifado de TI
├── Administrativo
└── Garagem

Filial Santos
├── Operacional
├── Almoxarifado
└── Garagem




 11. Módulo de patrimônio
11.1 Cadastro de ativo
Campos mínimos:

- Código interno. 
- Número patrimonial. 
- Número de série. 
- Categoria. 
- Subcategoria. 
- Marca. 
- Modelo. 
- Descrição. 
- Estado de conservação. 
- Status. 
- Filial. 
- Localização. 
- Setor. 
- Centro de custo. 
- Responsável. 
- Fornecedor. 
- Data de compra. 
- Valor de compra. 
- Número da nota fiscal. 
- Data de início da garantia. 
- Data de término da garantia. 
- Vida útil estimada. 
- Fotos. 
- Documentos. 
- Observações. 
11.2 Campos personalizados
Cada tenant poderá criar campos adicionais.
Exemplos:

- Endereço MAC. 
- IMEI. 
- Processador. 
- Memória. 
- Tamanho do disco. 
- Voltagem. 
- Capacidade. 
- Número do contrato. 
- Patrimônio anterior. 
11.3 Status do ativo

- Disponível. 
- Em uso. 
- Reservado. 
- Emprestado. 
- Em manutenção. 
- Aguardando manutenção. 
- Em transferência. 
- Extraviado. 
- Danificado. 
- Obsoleto. 
- Baixado. 
- Vendido. 
- Doado. 


 12. Identificação por QR Code
Cada ativo deverá possuir:

- Código único. 
- QR Code. 
- Etiqueta imprimível. 
- URL interna. 
Ao ler o QR Code, o usuário autorizado deverá visualizar:

- Identificação. 
- Status. 
- Localização. 
- Responsável. 
- Garantia. 
- Histórico. 
- Documentos. 
- Ações permitidas. 
O sistema deverá permitir impressão individual e em lote.


 13. Movimentações patrimoniais
Tipos:

- Entrega. 
- Devolução. 
- Empréstimo. 
- Transferência entre setores. 
- Transferência entre filiais. 
- Reserva. 
- Envio para manutenção. 
- Retorno de manutenção. 
- Baixa. 
- Venda. 
- Doação. 
- Extravio. 
Cada movimentação deverá armazenar:

- Ativo. 
- Origem. 
- Destino. 
- Responsável anterior. 
- Novo responsável. 
- Usuário responsável pela operação. 
- Data. 
- Motivo. 
- Condição anterior. 
- Condição posterior. 
- Fotos. 
- Documento. 
- Aceite. 
O histórico não poderá ser apagado.


 14. Termos de responsabilidade
O sistema deverá gerar termos para:

- Entrega. 
- Empréstimo. 
- Devolução. 
- Transferência. 
- Registro de avaria. 
- Recebimento de veículo. 
- Devolução de veículo. 
O termo poderá conter:

- Dados da empresa. 
- Dados do colaborador. 
- Dados do ativo. 
- Acessórios. 
- Estado do item. 
- Fotos. 
- Data. 
- Regras de responsabilidade. 
- Aceite. 
- Código de validação. 
Formatos:

- PDF. 
- Impressão. 
- Aceite eletrônico simples. 


 15. Inventário físico
15.1 Campanha de inventário
O administrador poderá:

- Criar campanha. 
- Selecionar filiais. 
- Selecionar setores. 
- Selecionar categorias. 
- Definir responsáveis. 
- Definir período. 
- Definir regras. 
15.2 Fluxo

1. Criar campanha. 
2. Gerar lista esperada. 
3. Ler QR Codes. 
4. Registrar condições. 
5. Comparar esperado e localizado. 
6. Registrar divergências. 
7. Encerrar campanha. 
8. Gerar relatório. 
15.3 Estados

- Localizado. 
- Não localizado. 
- Localizado em setor incorreto. 
- Com responsável divergente. 
- Danificado. 
- Sem etiqueta. 
- Não cadastrado. 
- Duplicado. 


 16. Garantias e documentos
16.1 Tipos de documentos

- Nota fiscal. 
- Garantia do fabricante. 
- Garantia estendida. 
- Contrato. 
- Seguro. 
- Manual. 
- Laudo. 
- Certificado. 
- Documento de calibração. 
- Documento de locação. 
16.2 Alertas

- 90 dias antes. 
- 60 dias antes. 
- 30 dias antes. 
- 15 dias antes. 
- No vencimento. 
- Após vencimento. 
16.3 Indicadores

- Garantias vencendo. 
- Garantias vencidas. 
- Ativos sem nota fiscal. 
- Ativos sem garantia. 
- Contratos vencendo. 
- Documentos ausentes. 


 17. Módulo de manutenção
17.1 Ordem de serviço
Campos:

- Número. 
- Ativo. 
- Tipo. 
- Prioridade. 
- Problema relatado. 
- Diagnóstico. 
- Solução. 
- Responsável. 
- Fornecedor. 
- Data de abertura. 
- Data prevista. 
- Data de conclusão. 
- Custo de peças. 
- Custo de serviço. 
- Tempo parado. 
- Fotos. 
- Documentos. 
- Status. 
17.2 Tipos

- Preventiva. 
- Corretiva. 
- Inspeção. 
- Calibração. 
- Revisão. 
- Limpeza. 
- Atualização. 
- Substituição de peça. 
17.3 Status

- Aberta. 
- Em análise. 
- Aguardando aprovação. 
- Aguardando fornecedor. 
- Aguardando peça. 
- Em execução. 
- Concluída. 
- Cancelada. 
17.4 Manutenção preventiva
Critérios:

- Data. 
- Dias. 
- Quilometragem. 
- Horas de uso. 
- Ciclos. 
- Recomendação do fabricante. 


 18. Módulo de almoxarifado
18.1 Cadastro de produto
Campos:

- Código. 
- SKU. 
- Nome. 
- Categoria. 
- Unidade de medida. 
- Marca. 
- Fabricante. 
- Estoque mínimo. 
- Estoque máximo. 
- Ponto de reposição. 
- Local de armazenamento. 
- Custo médio. 
- Controle por lote. 
- Controle por validade. 
- Fornecedor preferencial. 
- Foto. 
- Código de barras. 
- Status. 
18.2 Tipos de movimentação

- Entrada por compra. 
- Entrada por devolução. 
- Ajuste positivo. 
- Saída por consumo. 
- Saída por requisição. 
- Saída por perda. 
- Ajuste negativo. 
- Transferência. 
- Reserva. 
- Inventário. 
18.3 Controle por lote
Cada lote poderá possuir:

- Número. 
- Produto. 
- Fornecedor. 
- Data de entrada. 
- Quantidade. 
- Validade. 
- Custo. 
- Localização. 
18.4 Alertas

- Estoque abaixo do mínimo. 
- Estoque zerado. 
- Excesso de estoque. 
- Lote próximo do vencimento. 
- Lote vencido. 
- Produto sem movimentação. 
- Divergência de inventário. 


 19. Requisições de materiais
19.1 Fluxo

Colaborador solicita
        ↓
Gestor aprova
        ↓
Almoxarife separa
        ↓
Colaborador retira
        ↓
Saída é registrada


 19.2 Status

- Rascunho. 
- Solicitada. 
- Aguardando aprovação. 
- Aprovada. 
- Rejeitada. 
- Em separação. 
- Pronta para retirada. 
- Entregue. 
- Parcialmente atendida. 
- Cancelada. 
19.3 Regras configuráveis

- Aprovação obrigatória. 
- Limite por colaborador. 
- Limite por setor. 
- Quantidade máxima. 
- Periodicidade. 
- Centro de custo. 
- Produtos restritos. 


 20. Módulo de frota
20.1 Cadastro de veículo
Campos:

- Placa. 
- Renavam. 
- Chassi. 
- Marca. 
- Modelo. 
- Ano. 
- Cor. 
- Tipo. 
- Combustível. 
- Capacidade. 
- Filial. 
- Centro de custo. 
- Status. 
- Quilometragem atual. 
- Data de aquisição. 
- Valor. 
- Tipo de propriedade. 
- Locadora. 
- Apólice. 
- Documentos. 
- Fotos. 
20.2 Status

- Disponível. 
- Em uso. 
- Reservado. 
- Em manutenção. 
- Indisponível. 
- Sinistrado. 
- Vendido. 
- Devolvido à locadora. 


 21. Motoristas e autorizações
O sistema deverá controlar:

- Colaboradores autorizados. 
- Número da CNH. 
- Categoria. 
- Validade. 
- Restrições. 
- Veículos autorizados. 
- Histórico de uso. 
O sistema deverá bloquear a retirada quando:

- CNH estiver vencida. 
- Categoria for incompatível. 
- Usuário estiver suspenso. 
- Veículo estiver indisponível. 
- Documento obrigatório estiver vencido. 
- Manutenção obrigatória estiver atrasada. 


 22. Retirada e devolução de veículos
22.1 Retirada
Campos:

- Veículo. 
- Condutor. 
- Data e hora. 
- Quilometragem inicial. 
- Destino. 
- Finalidade. 
- Centro de custo. 
- Nível de combustível. 
- Checklist. 
- Fotos. 
- Observações. 
22.2 Devolução
Campos:

- Data e hora. 
- Quilometragem final. 
- Nível de combustível. 
- Checklist. 
- Fotos. 
- Avarias. 
- Observações. 
22.3 Regra de quilometragem

Quilômetros percorridos =
quilometragem final - quilometragem inicial


 A quilometragem final não poderá ser menor que a inicial.


 23. Checklist de veículo
Itens configuráveis:

- Pneus. 
- Faróis. 
- Lanternas. 
- Vidros. 
- Retrovisores. 
- Lataria. 
- Combustível. 
- Documentação. 
- Estepe. 
- Ferramentas. 
- Limpeza. 
- Avarias. 
- Fotos. 
O tenant poderá definir itens obrigatórios.


 24. Combustível e despesas
24.1 Abastecimento
Campos:

- Veículo. 
- Condutor. 
- Data. 
- Posto. 
- Tipo de combustível. 
- Litros. 
- Valor por litro. 
- Valor total. 
- Quilometragem. 
- Comprovante. 
- Centro de custo. 
24.2 Indicadores

- Quilômetros por litro. 
- Custo por quilômetro. 
- Gastos por veículo. 
- Gastos por período. 
- Gastos por condutor. 
- Variações anormais. 
24.3 Outras despesas

- Pedágio. 
- Estacionamento. 
- Lavagem. 
- Multa. 
- Seguro. 
- Licenciamento. 
- Pneu. 
- Manutenção. 
- Locação. 


 25. Multas e ocorrências
25.1 Multas
Campos:

- Veículo. 
- Condutor. 
- Data. 
- Local. 
- Tipo. 
- Valor. 
- Pontos. 
- Documento. 
- Status. 
- Responsável pelo pagamento. 
- Vencimento. 
- Recurso. 
25.2 Ocorrências
Tipos:

- Acidente. 
- Avaria. 
- Furto. 
- Pane. 
- Uso indevido. 
- Divergência de quilometragem. 
- Falta de combustível. 
- Atraso na devolução. 


 26. Notificações
Canais do MVP:

- E-mail. 
- Notificação interna. 
Eventos:

- Garantia vencendo. 
- Garantia vencida. 
- Manutenção próxima. 
- Manutenção atrasada. 
- Estoque abaixo do mínimo. 
- Produto próximo do vencimento. 
- Requisição aguardando aprovação. 
- Material pronto para retirada. 
- Veículo atrasado. 
- Documento vencendo. 
- CNH vencendo. 
- Ativo não devolvido. 
- Inventário pendente. 


 27. Dashboards
27.1 Dashboard geral

- Total de ativos. 
- Valor total do patrimônio. 
- Ativos em uso. 
- Ativos disponíveis. 
- Ativos em manutenção. 
- Ativos sem responsável. 
- Ativos sem localização. 
- Garantias vencendo. 
- Manutenções atrasadas. 
- Estoque abaixo do mínimo. 
- Produtos vencendo. 
- Veículos disponíveis. 
- Veículos em uso. 
- Documentos vencendo. 
27.2 Patrimônio

- Ativos por categoria. 
- Ativos por setor. 
- Ativos por filial. 
- Equipamentos por colaborador. 
- Idade média dos ativos. 
- Custo de manutenção. 
- Ativos ociosos. 
- Ativos não localizados. 
27.3 Estoque

- Valor em estoque. 
- Giro de estoque. 
- Consumo por setor. 
- Produtos com maior saída. 
- Produtos parados. 
- Perdas. 
- Vencimentos. 
27.4 Frota

- Quilômetros percorridos. 
- Custo por quilômetro. 
- Consumo médio. 
- Gastos com combustível. 
- Gastos com manutenção. 
- Veículos mais utilizados. 
- Motoristas com maior utilização. 
- Revisões próximas. 


 28. Relatórios
28.1 Patrimônio

- Relação de ativos. 
- Ativos por responsável. 
- Ativos por setor. 
- Ativos por filial. 
- Ativos disponíveis. 
- Ativos em manutenção. 
- Ativos sem responsável. 
- Ativos sem localização. 
- Garantias. 
- Movimentações. 
- Inventário. 
- Baixas. 
- Custos. 
28.2 Almoxarifado

- Saldo de estoque. 
- Entradas. 
- Saídas. 
- Movimentações. 
- Consumo por setor. 
- Consumo por colaborador. 
- Estoque mínimo. 
- Produtos vencidos. 
- Produtos próximos do vencimento. 
- Lotes. 
- Inventário. 
28.3 Frota

- Utilização por veículo. 
- Utilização por motorista. 
- Quilometragem. 
- Combustível. 
- Despesas. 
- Manutenções. 
- Multas. 
- Avarias. 
- Documentos vencendo. 
- Custo por quilômetro. 
28.4 Exportações

- CSV. 
- XLSX. 
- PDF em fase posterior. 


 29. Auditoria
Ações auditáveis:

- Login. 
- Criação de ativo. 
- Edição de ativo. 
- Transferência. 
- Entrega. 
- Devolução. 
- Baixa. 
- Entrada de estoque. 
- Saída de estoque. 
- Ajuste. 
- Alteração de quilometragem. 
- Registro de combustível. 
- Abertura de manutenção. 
- Alteração de documento. 
- Exportação de relatório. 
- Alteração de permissão. 
Campos:

- Tenant. 
- Usuário. 
- Ação. 
- Entidade. 
- Identificador. 
- Valores anteriores. 
- Valores novos. 
- Data. 
- IP. 
- User agent. 


 30. Requisitos não funcionais
30.1 Segurança

- HTTPS obrigatório. 
- RLS. 
- Service role apenas no backend. 
- Segredos fora do repositório. 
- Buckets privados. 
- URLs temporárias. 
- Validação de entrada. 
- Controle de CORS. 
- Logs de auditoria. 
- Backups. 
- Testes de isolamento. 
30.2 Desempenho

- Paginação. 
- Índices por tenant. 
- Índices para filtros. 
- Cache. 
- Filas para relatórios pesados. 
- Processamento assíncrono. 
30.3 Disponibilidade

- Containers. 
- Health checks. 
- Reinício automático. 
- Monitoramento. 
- Logs centralizados. 
- Backup. 
- Plano de restauração. 
30.4 Responsividade

- Desktop. 
- Notebook. 
- Tablet. 
- Smartphone. 
30.5 Acessibilidade

- Navegação por teclado. 
- Contraste adequado. 
- Rótulos. 
- Leitores de tela. 
- Formulários acessíveis. 


 31. Arquitetura técnica

Usuário
   ↓
NGINX ou Traefik
   ↓
Next.js
   ↓
Fastify API
   ├── Supabase Database
   ├── Supabase Auth
   ├── Supabase Storage
   ├── Redis
   ├── BullMQ
   ├── Serviço de e-mail
   └── Integrações

Worker
   ├── Alertas
   ├── Relatórios
   ├── Geração de documentos
   ├── Geração de QR Code
   ├── Manutenções preventivas
   ├── Verificação de vencimentos
   └── Importações


 31.1 Responsabilidade do Next.js

- Interface. 
- Navegação. 
- Formulários. 
- Dashboards. 
- Consulta de QR Code. 
- Consumo da API. 
31.2 Responsabilidade do Fastify

- Regras de negócio. 
- Movimentações. 
- Aprovações. 
- Cálculos. 
- Relatórios. 
- Geração de termos. 
- Auditoria. 
- Permissões. 
- Integrações. 
31.3 Responsabilidade do Supabase

- Banco. 
- Autenticação. 
- Storage. 
- RLS. 
- Realtime. 
- Funções SQL controladas. 
31.4 Responsabilidade do Redis e BullMQ

- Filas. 
- Jobs. 
- Retentativas. 
- Relatórios pesados. 
- Alertas. 
- Processamento de documentos. 


 32. Modelo inicial de dados
Tabelas sugeridas:

tenants
tenant_domains
tenant_branding
tenant_settings
tenant_modules

profiles
tenant_memberships
membership_roles

branches
departments
cost_centers
locations
suppliers

asset_categories
assets
asset_custom_fields
asset_custom_values
asset_documents
asset_images
asset_assignments
asset_movements
asset_terms

inventory_campaigns
inventory_expected_assets
inventory_scans
inventory_divergences

warranties
maintenance_plans
maintenance_orders
maintenance_costs

stock_categories
stock_products
stock_locations
stock_batches
stock_balances
stock_movements
stock_requisitions
stock_requisition_items

vehicles
vehicle_drivers
vehicle_authorizations
vehicle_reservations
vehicle_usages
vehicle_checklists
vehicle_fuelings
vehicle_expenses
vehicle_fines
vehicle_incidents
vehicle_documents

notifications
notification_templates
audit_logs
background_jobs




 33. Módulos da API

/auth
/tenants
/branding
/users
/branches
/departments
/cost-centers
/locations
/suppliers

/assets
/asset-categories
/asset-assignments
/asset-movements
/asset-terms
/inventories
/warranties
/maintenance

/stock/products
/stock/batches
/stock/movements
/stock/requisitions
/stock/inventories

/fleet/vehicles
/fleet/drivers
/fleet/reservations
/fleet/usages
/fleet/checklists
/fleet/fuelings
/fleet/expenses
/fleet/fines
/fleet/incidents

/reports
/notifications
/audit
/admin




 34. Telas do MVP
Públicas

- Login. 
- Recuperar senha. 
- Aceitar convite. 
- Validar termo ou documento. 
Colaborador

- Início. 
- Meus ativos. 
- Solicitar material. 
- Minhas requisições. 
- Retirar veículo. 
- Devolver veículo. 
- Meus termos. 
- Perfil. 
Patrimônio

- Dashboard. 
- Ativos. 
- Categorias. 
- Cadastro. 
- Movimentações. 
- Entregas. 
- Devoluções. 
- Inventários. 
- Garantias. 
- Manutenções. 
- Relatórios. 
Almoxarifado

- Dashboard. 
- Produtos. 
- Entradas. 
- Saídas. 
- Transferências. 
- Requisições. 
- Lotes. 
- Inventários. 
- Relatórios. 
Frota

- Dashboard. 
- Veículos. 
- Motoristas. 
- Reservas. 
- Retiradas. 
- Devoluções. 
- Abastecimentos. 
- Despesas. 
- Multas. 
- Ocorrências. 
- Relatórios. 
Administração

- Usuários. 
- Filiais. 
- Setores. 
- Centros de custo. 
- Localizações. 
- Fornecedores. 
- Permissões. 
- Configurações. 
- Auditoria. 
Superadministrador

- Tenants. 
- Domínios. 
- Planos. 
- Módulos. 
- Limites. 
- Saúde. 
- Jobs. 
- Logs. 


 35. Critérios de aceite do MVP
Tenant e white-label

- Superadministrador cria tenant. 
- Tenant possui domínio. 
- Logo e cores são aplicados. 
- Dados não vazam entre tenants. 
Usuários

- Administrador cria, convida e desativa usuários. 
- Usuário possui setor, filial e perfil. 
- Usuário desativado não acessa. 
Patrimônio

- Gestor cadastra ativo. 
- Sistema gera QR Code. 
- Ativo possui responsável e localização. 
- Movimentação gera histórico. 
- Termo pode ser emitido. 
Garantia

- Garantia pode ser cadastrada. 
- Sistema alerta antes do vencimento. 
- Documento pode ser anexado. 
Manutenção

- Ordem de serviço pode ser aberta. 
- Custos podem ser registrados. 
- Ativo muda de status. 
- Histórico é preservado. 
Estoque

- Produto pode ser cadastrado. 
- Entrada aumenta saldo. 
- Saída reduz saldo. 
- Estoque mínimo gera alerta. 
- Requisição segue fluxo de aprovação. 
Frota

- Veículo pode ser cadastrado. 
- Motorista pode ser autorizado. 
- Retirada registra quilometragem inicial. 
- Devolução registra quilometragem final. 
- Sistema calcula distância. 
- Abastecimento pode ser registrado. 
Inventário

- Campanha pode ser criada. 
- QR Code pode ser lido. 
- Divergências são registradas. 
- Relatório pode ser gerado. 
Relatórios

- Usuário autorizado filtra relatórios. 
- Relatórios podem ser exportados. 
- Exportação é auditada. 


 36. Estrutura inicial do repositório

inner-almox/
├── apps/
│   ├── web/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   ├── lib/
│   │   └── public/
│   │
│   ├── api/
│   │   └── src/
│   │       ├── modules/
│   │       ├── plugins/
│   │       ├── middleware/
│   │       ├── services/
│   │       ├── jobs/
│   │       └── server.ts
│   │
│   └── worker/
│       └── src/
│           ├── queues/
│           ├── processors/
│           └── worker.ts
│
├── packages/
│   ├── ui/
│   ├── database/
│   ├── auth/
│   ├── permissions/
│   ├── validation/
│   ├── storage/
│   ├── qr-code/
│   ├── documents/
│   ├── reporting/
│   └── shared/
│
├── supabase/
│   ├── migrations/
│   ├── functions/
│   ├── seed.sql
│   └── config.toml
│
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── API.md
│   ├── SECURITY.md
│   └── TASKS.md
│
├── infra/
│   ├── docker/
│   ├── nginx/
│   └── scripts/
│
├── .env.example
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── README.md




 37. Variáveis de ambiente iniciais

NODE_ENV=development

APP_URL=http://localhost:3000
API_URL=http://localhost:3333

SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

REDIS_URL=redis://localhost:6379

SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=

DOCUMENT_PUBLIC_URL=
QR_CODE_BASE_URL=

SENTRY_DSN=




 38. Roadmap sugerido
Sprint 0 — Fundação

- Monorepo. 
- Next.js. 
- Fastify. 
- Worker. 
- Supabase. 
- Redis. 
- Autenticação. 
- Multi-tenant. 
- RLS. 
- Auditoria. 
- White-label básico. 
Sprint 1 — Estrutura empresarial

- Filiais. 
- Setores. 
- Centros de custo. 
- Localizações. 
- Usuários. 
- Perfis. 
- Fornecedores. 
Sprint 2 — Patrimônio

- Categorias. 
- Ativos. 
- Fotos. 
- Documentos. 
- QR Code. 
- Status. 
- Filtros. 
Sprint 3 — Movimentações

- Entrega. 
- Devolução. 
- Empréstimo. 
- Transferência. 
- Termo. 
- Histórico. 
Sprint 4 — Garantias e manutenção

- Garantias. 
- Alertas. 
- Ordens de serviço. 
- Custos. 
- Preventivas. 
Sprint 5 — Almoxarifado

- Produtos. 
- Estoques. 
- Entradas. 
- Saídas. 
- Transferências. 
- Requisições. 
- Estoque mínimo. 
Sprint 6 — Frota

- Veículos. 
- Motoristas. 
- Retiradas. 
- Devoluções. 
- Quilometragem. 
- Checklists. 
Sprint 7 — Custos de frota

- Abastecimentos. 
- Despesas. 
- Manutenções. 
- Multas. 
- Indicadores. 
Sprint 8 — Inventário

- Campanhas. 
- Leitura de QR Code. 
- Divergências. 
- Relatórios. 
Sprint 9 — White-label comercial

- Domínios. 
- Planos. 
- Limites. 
- Provisionamento. 
- Painel InnerWorks. 
- Instalação dedicada. 


 39. Primeiras tarefas técnicas

1. Criar repositório inner-almox. 
2. Configurar monorepo com pnpm e Turborepo. 
3. Criar apps/web. 
4. Criar apps/api. 
5. Criar apps/worker. 
6. Criar projeto Supabase de desenvolvimento. 
7. Configurar Supabase CLI. 
8. Criar migrations iniciais. 
9. Criar tenants. 
10. Criar profiles. 
11. Criar tenant_memberships. 
12. Criar RLS. 
13. Criar autenticação. 
14. Criar resolução do tenant. 
15. Criar auditoria. 
16. Criar módulos de filiais e setores. 
17. Criar módulo de localizações. 
18. Criar módulo de fornecedores. 
19. Criar módulo de ativos. 
20. Criar geração de QR Code. 
21. Criar testes de isolamento. 
22. Configurar Redis. 
23. Criar primeira fila. 
24. Configurar CI. 
25. Criar .env.example. 
26. Documentar setup local. 


 40. Definição de pronto
Uma funcionalidade será considerada pronta quando:

- Possuir permissão implementada. 
- Possuir RLS quando aplicável. 
- Possuir validação. 
- Possuir tratamento de erro. 
- Possuir estado de carregamento. 
- Possuir auditoria quando aplicável. 
- Possuir testes críticos. 
- Funcionar em desktop e mobile. 
- Estiver documentada. 
- Não permitir acesso entre tenants. 
- Estiver aprovada em homologação. 


 41. Decisões técnicas obrigatórias

- Supabase será o banco e provedor de autenticação. 
- Prisma não será utilizado. 
- Migrations ficarão em supabase/migrations. 
- Fastify protegerá operações críticas. 
- Service role nunca será exposta. 
- Toda tabela de negócio possuirá tenant_id. 
- Ativos, estoque e veículos serão domínios separados. 
- Fotos e documentos ficarão em storage externo. 
- A VPS será usada para aplicação, workers, cache e processamento. 
- Relatórios pesados usarão filas. 
- Históricos não serão apagados sem auditoria. 
- O sistema suportará SaaS multi-tenant e instalação dedicada. 
- Movimentações patrimoniais serão imutáveis. 
- Quilometragem não poderá regredir. 
- Saídas de estoque não poderão gerar saldo negativo sem permissão especial. 
- Termos e documentos deverão possuir código de validação. 


 42. Resultado esperado do MVP
Ao final do MVP, a InnerWorks deverá conseguir:

1. Criar o próprio tenant. 
2. Aplicar identidade visual. 
3. Cadastrar colaboradores. 
4. Cadastrar filiais, setores e locais. 
5. Cadastrar todos os ativos. 
6. Gerar QR Codes. 
7. Saber onde cada item está. 
8. Saber quem é o responsável. 
9. Registrar entregas e devoluções. 
10. Gerar termos. 
11. Controlar garantias. 
12. Controlar manutenções. 
13. Controlar estoque. 
14. Criar requisições. 
15. Controlar veículos. 
16. Registrar quilometragem. 
17. Registrar combustível e despesas. 
18. Realizar inventários. 
19. Gerar relatórios. 
20. Criar novos clientes white-label sem alterar o código. 
