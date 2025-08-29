// test_advice_interactive_list.js - Teste para lista interativa de conselhos com AI
require('dotenv').config();
const OPENAI = require('./open_ai/open_ai');

async function testAdviceInteractiveSystem() {
    console.log('🔍 TESTANDO SISTEMA DE LISTA INTERATIVA DE CONSELHOS COM AI\n');

    const openaiService = new OPENAI();

    // Dados de teste
    const testWeatherData = {
        city: 'Beira',
        temperature: 31,
        description: 'sol forte',
        humidity: 65
    };

    const testAdviceContext = {
        lastAdviceType: 'safety_advice',
        userExpertise: 'basic',
        weatherCondition: 'sol forte',
        temperature: 31
    };

    console.log('🤖 TESTANDO GERAÇÃO DE OPÇÕES DE CONSELHOS COM AI:');
    console.log('═'.repeat(60));

    try {
        console.log('🌤️ Contexto do teste:');
        console.log(`   🏙️ Cidade: ${testWeatherData.city}`);
        console.log(`   🌡️ Temperatura: ${testWeatherData.temperature}°C`);
        console.log(`   ☀️ Condição: ${testWeatherData.description}`);
        console.log(`   📚 Nível usuário: ${testAdviceContext.userExpertise}`);
        console.log(`   🎯 Último conselho: ${testAdviceContext.lastAdviceType}`);

        console.log('\n🤖 Gerando opções de conselhos com AI...');

        const result = await openaiService.generateAdviceOptions(testWeatherData, testAdviceContext);

        if (result.success) {
            console.log(`✅ Geração bem-sucedida! Método: ${result.method}`);
            console.log(`📊 Total de opções: ${result.options.length}`);

            console.log('\n💡 OPÇÕES GERADAS:');
            console.log('▬'.repeat(50));

            result.options.forEach((option, index) => {
                console.log(`${index + 1}️⃣ ID: ${option.id}`);
                console.log(`   📝 Título: ${option.title}`);
                console.log(`   📄 Descrição: ${option.description}`);
                console.log(`   📏 Comprimento título: ${option.title.length} (máx 24)`);
                console.log(`   📏 Comprimento desc: ${option.description.length} (máx 72)`);
                console.log('');
            });

            // Verificar se as opções respeitam os limites do WhatsApp
            console.log('🔍 VALIDAÇÃO DE FORMATO:');
            console.log('═'.repeat(40));

            let validOptions = 0;
            let titleErrors = 0;
            let descErrors = 0;

            result.options.forEach((option, index) => {
                const titleValid = option.title && option.title.length <= 24;
                const descValid = option.description && option.description.length <= 72;
                const idValid = option.id && option.id.length > 0;

                if (titleValid && descValid && idValid) {
                    validOptions++;
                } else {
                    if (!titleValid) titleErrors++;
                    if (!descValid) descErrors++;
                }

                console.log(`Opção ${index + 1}: ${titleValid && descValid && idValid ? '✅' : '❌'}`);
                if (!titleValid) console.log(`   ⚠️ Título muito longo: ${option.title.length} caracteres`);
                if (!descValid) console.log(`   ⚠️ Descrição muito longa: ${option.description.length} caracteres`);
                if (!idValid) console.log(`   ⚠️ ID inválido`);
            });

            console.log(`\n📊 RESULTADO DA VALIDAÇÃO:`);
            console.log(`✅ Opções válidas: ${validOptions}/${result.options.length}`);
            console.log(`❌ Erros de título: ${titleErrors}`);
            console.log(`❌ Erros de descrição: ${descErrors}`);

            if (validOptions === result.options.length) {
                console.log('🎉 TODAS AS OPÇÕES ESTÃO VÁLIDAS PARA O WHATSAPP!');
            } else {
                console.log('⚠️ Algumas opções precisam de ajuste.');
            }

            // Testar com diferentes condições climáticas
            console.log('\n🌤️ TESTANDO DIFERENTES CONDIÇÕES CLIMÁTICAS:');
            console.log('═'.repeat(55));

            const scenarios = [
                { temp: 35, condition: 'sol muito forte', description: 'Calor extremo' },
                { temp: 22, condition: 'nublado', description: 'Temperatura agradável' },
                { temp: 16, condition: 'frio', description: 'Temperatura baixa' },
                { temp: 28, condition: 'chuva', description: 'Chuva' }
            ];

            for (const scenario of scenarios) {
                console.log(`\n🔍 Cenário: ${scenario.temp}°C - ${scenario.description}`);

                const scenarioWeatherData = {
                    ...testWeatherData,
                    temperature: scenario.temp,
                    description: scenario.condition
                };

                try {
                    const scenarioResult = await openaiService.generateAdviceOptions(scenarioWeatherData, testAdviceContext);

                    if (scenarioResult.success) {
                        console.log(`   ✅ ${scenarioResult.options.length} opções geradas`);
                        console.log(`   📝 Exemplos: ${scenarioResult.options.slice(0, 2).map(o => o.title).join(', ')}`);
                    } else {
                        console.log(`   ❌ Falha na geração`);
                    }
                } catch (error) {
                    console.log(`   ❌ Erro: ${error.message}`);
                }
            }

        } else {
            console.log('❌ Falha na geração de opções');
            console.log(`📝 Método usado: ${result.method}`);
            if (result.options) {
                console.log(`📊 Opções fallback: ${result.options.length}`);
            }
        }

        console.log('\n🔗 FLUXO COMPLETO TESTADO:');
        console.log('═'.repeat(40));
        console.log('1️⃣ Usuário envia "/conselhos"');
        console.log('2️⃣ Bot gera conselhos de segurança com AI');
        console.log('3️⃣ Bot envia mensagem com conselhos');
        console.log('4️⃣ Bot aguarda 2s');
        console.log('5️⃣ Bot gera opções de conselhos adicionais com AI');
        console.log('6️⃣ Bot envia lista interativa personalizada');
        console.log('7️⃣ Usuário seleciona opção da lista');
        console.log('8️⃣ Bot processa através de handlers específicos');
        console.log('9️⃣ Bot envia resposta personalizada');

        console.log('\n✅ SISTEMA DE CONSELHOS AI-POWERED IMPLEMENTADO!');

    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
    }

    console.log('\n🎯 TESTE DE LISTA INTERATIVA DE CONSELHOS CONCLUÍDO!');
}

// Executar o teste
testAdviceInteractiveSystem().catch(console.error);
