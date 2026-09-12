const NOVA_GAMES = [
    {
        id: "mlbb",
        name: "Mobile Legends: Bang Bang",
        shortName: "MLBB",
        genre: "MOBA",
        icon: "icons/games/mlbb.png",
        colors: { primary: "#ffb300", secondary: "#ff6f00" },
        pingOffset: 5
    },
    {
        id: "codm",
        name: "Call of Duty: Mobile",
        shortName: "CODM",
        genre: "FPS",
        icon: "icons/games/codm.png",
        colors: { primary: "#22d3ee", secondary: "#2563eb" },
        pingOffset: 10
    },
    {
        id: "df",
        name: "Delta Force",
        shortName: "DF",
        genre: "Tactical FPS",
        icon: "icons/games/df.png",
        colors: { primary: "#94a3b8", secondary: "#475569" },
        pingOffset: 18
    },
    {
        id: "pubg",
        name: "PUBG Mobile",
        shortName: "PUBG",
        genre: "Battle Royale",
        icon: "icons/games/pubg.png",
        colors: { primary: "#facc15", secondary: "#f59e0b" },
        pingOffset: 8
    },
    {
        id: "ff",
        name: "Free Fire",
        shortName: "FF",
        genre: "Battle Royale",
        icon: "icons/games/ff.png",
        colors: { primary: "#fb7185", secondary: "#ef4444" },
        pingOffset: 6
    },
    {
        id: "fc",
        name: "EA SPORTS FC Mobile",
        shortName: "FC",
        genre: "Sports",
        icon: "icons/games/fc.png",
        colors: { primary: "#34d399", secondary: "#059669" },
        pingOffset: 12
    },
    {
        id: "ef",
        name: "eFootball",
        shortName: "eF",
        genre: "Sports",
        icon: "icons/games/ef.png",
        colors: { primary: "#60a5fa", secondary: "#2563eb" },
        pingOffset: 14
    },
    {
        id: "hok",
        name: "Honor of Kings",
        shortName: "HOK",
        genre: "MOBA",
        icon: "icons/games/hok.png",
        colors: { primary: "#c084fc", secondary: "#7c3aed" },
        pingOffset: 7
    }
];

function getGameById(id) {
    return NOVA_GAMES.find(game => game.id === id) || null;
}

function getAllGames() {
    return [...NOVA_GAMES];
}

function getFeaturedGames(count = 4) {
    return NOVA_GAMES.slice(0, count);
}
