// weather_api/city_normalizer.js
/**
 * NORMALIZADOR DE CIDADES MOÇAMBICANAS
 * 
 * Este módulo corrige nomes de cidades retornados pelas APIs internacionais
 * que frequentemente usam nomes coloniais ou desatualizados para Moçambique
 */

class CityNormalizer {
    constructor() {
        // Mapeamento de nomes coloniais/antigos para nomes atuais
        this.cityMapping = new Map([
            // Nomes coloniais para atuais
            ['Lacticīnia', 'Beira'],
            ['Lacticinia', 'Beira'],
            ['Lourenco Marques', 'Maputo'],
            ['Lourenço Marques', 'Maputo'],
            ['Porto Amélia', 'Pemba'],
            ['Vila Pery', 'Chimoio'],
            ['João Belo', 'Xai-Xai'],
            ['António Enes', 'Angoche'],
            ['Vila Cabral', 'Lichinga'],
            ['General Machado', 'Macia'],

            // Variações de escrita
            ['Maputo City', 'Maputo'],
            ['Maputo Municipality', 'Maputo'],
            ['Cidade de Maputo', 'Maputo'],
            ['Beira City', 'Beira'],
            ['Cidade da Beira', 'Beira'],
            ['Nampula City', 'Nampula'],

            // Correções de encoding/acentos
            ['Pemba City', 'Pemba'],
            ['Tête', 'Tete'],
            ['Tete City', 'Tete'],
            ['Quelimane City', 'Quelimane'],
            ['Inhambane City', 'Inhambane'],

            // Nomes em inglês para português
            ['Maputo Province', 'Maputo'],
            ['Gaza Province', 'Gaza'],
            ['Sofala Province', 'Beira'], // Capital da província
            ['Inhambane Province', 'Inhambane'],
            ['Manica Province', 'Chimoio'], // Capital da província
            ['Tete Province', 'Tete'],
            ['Zambézia Province', 'Quelimane'], // Capital da província
            ['Nampula Province', 'Nampula'],
            ['Cabo Delgado Province', 'Pemba'], // Capital da província
            ['Niassa Province', 'Lichinga'] // Capital da província
        ]);

        // Lista das principais cidades moçambicanas (para validação)
        this.validCities = new Set([
            'Maputo', 'Beira', 'Nampula', 'Quelimane', 'Tete', 'Pemba',
            'Chimoio', 'Xai-Xai', 'Inhambane', 'Lichinga', 'Angoche',
            'Chokwe', 'Dondo', 'Nacala', 'Cuamba', 'Gurué', 'Vilanculos',
            'Montepuez', 'Matola', 'Manhiça', 'Marracuene'
        ]);

        // Padrões para detectar coordenadas em Moçambique
        this.mozambiqueCoordinates = {
            latMin: -26.87,  // Sul de Moçambique
            latMax: -10.47,  // Norte de Moçambique  
            lonMin: 30.22,   // Oeste de Moçambique
            lonMax: 40.84    // Leste de Moçambique
        };
    }

    /**
     * Normaliza o nome da cidade
     */
    normalize(cityName, coordinates = null) {
        if (!cityName || typeof cityName !== 'string') {
            return cityName;
        }

        // 1. Limpar e padronizar
        let normalized = cityName.trim();

        // 2. Verificar mapeamento direto
        if (this.cityMapping.has(normalized)) {
            const correctedName = this.cityMapping.get(normalized);
            console.log(`🏙️ Cidade corrigida: "${normalized}" → "${correctedName}"`);
            return correctedName;
        }

        // 3. Verificar mapeamento case-insensitive
        for (const [old, newName] of this.cityMapping.entries()) {
            if (old.toLowerCase() === normalized.toLowerCase()) {
                console.log(`🏙️ Cidade corrigida (case-insensitive): "${normalized}" → "${newName}"`);
                return newName;
            }
        }

        // 4. Se temos coordenadas, verificar se estão em Moçambique
        if (coordinates && this.isInMozambique(coordinates.latitude, coordinates.longitude)) {
            // Se a cidade não é reconhecida mas as coordenadas estão em Moçambique,
            // tentar detectar cidade mais provável baseada em proximidade
            const nearestCity = this.findNearestKnownCity(coordinates.latitude, coordinates.longitude);
            if (nearestCity) {
                console.log(`📍 Cidade inferida por proximidade: "${normalized}" → "${nearestCity}"`);
                return nearestCity;
            }
        }

        // 5. Se já é uma cidade válida, manter
        if (this.validCities.has(normalized)) {
            return normalized;
        }

        // 6. Retornar original se não conseguiu normalizar
        return normalized;
    }

    /**
     * Verifica se as coordenadas estão em Moçambique
     */
    isInMozambique(latitude, longitude) {
        return latitude >= this.mozambiqueCoordinates.latMin &&
            latitude <= this.mozambiqueCoordinates.latMax &&
            longitude >= this.mozambiqueCoordinates.lonMin &&
            longitude <= this.mozambiqueCoordinates.lonMax;
    }

    /**
     * Encontra a cidade conhecida mais próxima baseada em coordenadas aproximadas
     */
    findNearestKnownCity(latitude, longitude) {
        // Coordenadas aproximadas das principais cidades
        const cityCoordinates = {
            'Maputo': { lat: -25.9664, lon: 32.5832 },
            'Beira': { lat: -19.8433, lon: 34.8394 },
            'Nampula': { lat: -15.1165, lon: 39.2666 },
            'Quelimane': { lat: -17.8786, lon: 36.8883 },
            'Tete': { lat: -16.1564, lon: 33.5867 },
            'Pemba': { lat: -12.9745, lon: 40.5178 },
            'Chimoio': { lat: -19.1164, lon: 33.4833 },
            'Xai-Xai': { lat: -25.0519, lon: 33.6442 },
            'Inhambane': { lat: -23.8650, lon: 35.3833 }
        };

        let nearestCity = null;
        let minDistance = Infinity;

        for (const [cityName, coords] of Object.entries(cityCoordinates)) {
            const distance = this.calculateDistance(latitude, longitude, coords.lat, coords.lon);
            if (distance < minDistance && distance < 50) { // Máximo 50km de distância
                minDistance = distance;
                nearestCity = cityName;
            }
        }

        return nearestCity;
    }

    /**
     * Calcula distância entre duas coordenadas (fórmula de Haversine simplificada)
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Raio da Terra em km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Normaliza os dados completos de clima
     */
    normalizeWeatherData(weatherData) {
        if (!weatherData || !weatherData.city) {
            return weatherData;
        }

        const originalCity = weatherData.city;
        const normalizedCity = this.normalize(originalCity, weatherData.coordinates);

        if (originalCity !== normalizedCity) {
            return {
                ...weatherData,
                city: normalizedCity,
                originalCity: originalCity // Manter referência do nome original
            };
        }

        return weatherData;
    }

    /**
     * Adiciona novo mapeamento de cidade
     */
    addMapping(oldName, newName) {
        this.cityMapping.set(oldName, newName);
        console.log(`📍 Novo mapeamento adicionado: "${oldName}" → "${newName}"`);
    }

    /**
     * Lista todos os mapeamentos ativos
     */
    listMappings() {
        console.log('🗺️ Mapeamentos de cidades ativos:');
        for (const [old, newName] of this.cityMapping.entries()) {
            console.log(`   "${old}" → "${newName}"`);
        }
    }
}

module.exports = CityNormalizer;
