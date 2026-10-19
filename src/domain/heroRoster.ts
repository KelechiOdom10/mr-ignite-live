import type { Hero } from "./stats";

/**
 * Every playable hero, from RivalsIsland's catalogue recorded 2026-10-17, named and keyed the way
 * mrvl.net scoreboards are so cached portraits line up. Ids for heroes mrvl hasn't shown yet are
 * slugs of the name.
 */
export const HERO_ROSTER: readonly Omit<Hero, "portraitUrl">[] = [
  { id: "adam-warlock", name: "Adam Warlock", role: "Strategist" },
  { id: "angela", name: "Angela", role: "Vanguard" },
  { id: "black-cat", name: "Black Cat", role: "Duelist" },
  { id: "black-panther", name: "Black Panther", role: "Duelist" },
  { id: "black-widow", name: "Black Widow", role: "Duelist" },
  { id: "blade", name: "Blade", role: "Duelist" },
  { id: "captain-america", name: "Captain America", role: "Vanguard" },
  { id: "cloak-and-dagger", name: "Cloak & Dagger", role: "Strategist" },
  { id: "cyclops", name: "Cyclops", role: "Duelist" },
  { id: "daredevil", name: "Daredevil", role: "Duelist" },
  { id: "deadpool-duelist", name: "Deadpool (Duelist)", role: "Duelist" },
  { id: "deadpool-strategist", name: "Deadpool (Strategist)", role: "Strategist" },
  { id: "deadpool-vanguard", name: "Deadpool (Vanguard)", role: "Vanguard" },
  { id: "devil-dinosaur", name: "Devil Dinosaur", role: "Vanguard" },
  { id: "doctor-strange", name: "Doctor Strange", role: "Vanguard" },
  { id: "elsa-bloodstone", name: "Elsa Bloodstone", role: "Duelist" },
  { id: "emma-frost", name: "Emma Frost", role: "Vanguard" },
  { id: "gambit", name: "Gambit", role: "Strategist" },
  { id: "gorr", name: "Gorr", role: "Duelist" },
  { id: "groot", name: "Groot", role: "Vanguard" },
  { id: "hawkeye", name: "Hawkeye", role: "Duelist" },
  { id: "hela", name: "Hela", role: "Duelist" },
  { id: "hulk", name: "Hulk", role: "Vanguard" },
  { id: "human-torch", name: "Human Torch", role: "Duelist" },
  { id: "invisible-woman", name: "Invisible Woman", role: "Strategist" },
  { id: "iron-fist", name: "Iron Fist", role: "Duelist" },
  { id: "iron-man", name: "Iron Man", role: "Duelist" },
  { id: "jeff-the-land-shark", name: "Jeff the Land Shark", role: "Strategist" },
  { id: "jubilee", name: "Jubilee", role: "Strategist" },
  { id: "loki", name: "Loki", role: "Strategist" },
  { id: "luna-snow", name: "Luna Snow", role: "Strategist" },
  { id: "magik", name: "Magik", role: "Duelist" },
  { id: "magneto", name: "Magneto", role: "Vanguard" },
  { id: "mantis", name: "Mantis", role: "Strategist" },
  { id: "mister-fantastic", name: "Mister Fantastic", role: "Duelist" },
  { id: "moon-knight", name: "Moon Knight", role: "Duelist" },
  { id: "namor", name: "Namor", role: "Duelist" },
  { id: "peni-parker", name: "Peni Parker", role: "Vanguard" },
  { id: "phoenix", name: "Phoenix", role: "Duelist" },
  { id: "psylocke", name: "Psylocke", role: "Duelist" },
  { id: "rocket-raccoon", name: "Rocket Raccoon", role: "Strategist" },
  { id: "rogue", name: "Rogue", role: "Vanguard" },
  { id: "scarlet-witch", name: "Scarlet Witch", role: "Duelist" },
  { id: "spider-man", name: "Spider-Man", role: "Duelist" },
  { id: "squirrel-girl", name: "Squirrel Girl", role: "Duelist" },
  { id: "star-lord", name: "Star-Lord", role: "Duelist" },
  { id: "storm", name: "Storm", role: "Duelist" },
  { id: "the-hood", name: "The Hood", role: "Vanguard" },
  { id: "the-punisher", name: "The Punisher", role: "Duelist" },
  { id: "the-thing", name: "The Thing", role: "Vanguard" },
  { id: "thor", name: "Thor", role: "Vanguard" },
  { id: "ultron", name: "Ultron", role: "Strategist" },
  { id: "venom", name: "Venom", role: "Vanguard" },
  { id: "white-fox", name: "White Fox", role: "Strategist" },
  { id: "winter-soldier", name: "Winter Soldier", role: "Duelist" },
  { id: "wolverine", name: "Wolverine", role: "Duelist" },
];

/**
 * Hero icons from the same recorded catalogue, for heroes mrvl hasn't shown in a cached scoreboard
 * yet. mrvl's own art is preferred when it has it.
 */
export const ROSTER_ICONS: ReadonlyMap<string, string> = new Map([
  [
    "adam-warlock",
    "https://assets.rivalsisland.com/v1/5b057fd42f25ee450764110f6cb9143dc2f647035c76b8cfc7038f28d4543f4e/heroes/1046_regular.png",
  ],
  [
    "angela",
    "https://assets.rivalsisland.com/v1/e665ff205267684ea9d074e778988fe703637457268509ef2c2df3e28a6cfb84/heroes/1056_regular.png",
  ],
  [
    "black-cat",
    "https://assets.rivalsisland.com/v1/9bc1440d9a85bc1e3cac80bc91ee753ba5c322852873f2a6e8d250e50a179b4c/heroes/1061_regular.png",
  ],
  [
    "black-panther",
    "https://assets.rivalsisland.com/v1/892335b37efb4cc016491884996a0ada72fa2c124731605bc9e106d9a4271a68/heroes/1026_regular.png",
  ],
  [
    "black-widow",
    "https://assets.rivalsisland.com/v1/67978424aae4be767d7c896e3c9e14a93f5c61ef98b90f8026e10784e917315c/heroes/1033_regular.png",
  ],
  [
    "blade",
    "https://assets.rivalsisland.com/v1/32c15d12499896fd55d7c5e06f9b3fec3961c29a8cb25b854975cc0d961201e8/heroes/1044_regular.png",
  ],
  [
    "captain-america",
    "https://assets.rivalsisland.com/v1/f218a74edda24f57bf8e51a8e57a85d07a71410bc37cb59c44e98cf2bf9ea9f9/heroes/1022_regular.png",
  ],
  [
    "cloak-and-dagger",
    "https://assets.rivalsisland.com/v1/11191ccfedec59edb40e10388d5c547a716f41708809c3cb6aa0361043b8a84e/heroes/1025_regular.png",
  ],
  [
    "cyclops",
    "https://assets.rivalsisland.com/v1/f40356065a2ddce22487581dce1b762bf1fbcf046f99bf2813b6c03fde1fd34c/heroes/1063_regular.png",
  ],
  [
    "daredevil",
    "https://assets.rivalsisland.com/v1/063d01fa45f4a1a441329331c3fb37ff13fbb7d19d1fae7640881a70cce74f27/heroes/1055_regular.png",
  ],
  [
    "deadpool-duelist",
    "https://assets.rivalsisland.com/v1/0660babc69a4f13ac0550bbd3fd5fab73d3eed3cb2d82f2207a89b55b62aeb39/heroes/1057_regular.png",
  ],
  [
    "deadpool-strategist",
    "https://assets.rivalsisland.com/v1/0660babc69a4f13ac0550bbd3fd5fab73d3eed3cb2d82f2207a89b55b62aeb39/heroes/1057_regular.png",
  ],
  [
    "deadpool-vanguard",
    "https://assets.rivalsisland.com/v1/0660babc69a4f13ac0550bbd3fd5fab73d3eed3cb2d82f2207a89b55b62aeb39/heroes/1057_regular.png",
  ],
  [
    "devil-dinosaur",
    "https://assets.rivalsisland.com/v1/aaf7089b8a05026b9f7d309dc8e68d7a9176f84f965292ab088251322a855177/heroes/1062_regular.png",
  ],
  [
    "doctor-strange",
    "https://assets.rivalsisland.com/v1/9279504e60ac0858f141589b509d41645532dbdc94fa1151ee0517fdc0f3f859/heroes/1018_regular.png",
  ],
  [
    "elsa-bloodstone",
    "https://assets.rivalsisland.com/v1/1af045d7a7f3a511ed56c3d00354f76edd253a42a23efd1ca1ebf21d1aa4f35c/heroes/1059_regular.png",
  ],
  [
    "emma-frost",
    "https://assets.rivalsisland.com/v1/8f4f00511e7e5095395b6452c82f67fbf48050b6bbf635afd4dd9c9aeed94c11/heroes/1053_regular.png",
  ],
  [
    "gambit",
    "https://assets.rivalsisland.com/v1/f260662bffbe4e0fc11e19a789c8d2fb0e18c3f597434a6892fd3e1176055b0a/heroes/1058_regular.png",
  ],
  [
    "gorr",
    "https://assets.rivalsisland.com/v1/4f9f43e69ea160037717c9742fa2642181b9d5ec2019559fa4ec77bf247cfdb3/heroes/1067_regular.png",
  ],
  [
    "groot",
    "https://assets.rivalsisland.com/v1/9f3d72a69f122a507c6294d5508739f8bf937a60124e6ea7cf9a489df0d9bfad/heroes/1027_regular.png",
  ],
  [
    "hawkeye",
    "https://assets.rivalsisland.com/v1/2c7fc448fa9f62d32c3d29cc10b38026ad0dcc58e310466f1bee175dbf15ff1a/heroes/1021_regular.png",
  ],
  [
    "hela",
    "https://assets.rivalsisland.com/v1/5a9a01c672d7579855a2e57185665827e5292b461312da37f3a0761debfd934e/heroes/1024_regular.png",
  ],
  [
    "hulk",
    "https://assets.rivalsisland.com/v1/3e80b34eed6a5e1c854b117a9a6c825c2e1724ff89ad6edc19e774e8120b3a50/heroes/1011_regular.png",
  ],
  [
    "human-torch",
    "https://assets.rivalsisland.com/v1/5f76af37fe4d4da33f79e3a9be5be31c3eb05b0df76cc09d6912c6952ac958a5/heroes/1017_regular.png",
  ],
  [
    "invisible-woman",
    "https://assets.rivalsisland.com/v1/21ca52b2442764e733be0b9a013f4892d8060bd5e5885a583911a73e60e8f08a/heroes/1050_regular.png",
  ],
  [
    "iron-fist",
    "https://assets.rivalsisland.com/v1/3948fbbdb40ead8532a097747a3fde9be957cf4753ffd2615fb244db468e3b37/heroes/1052_regular.png",
  ],
  [
    "iron-man",
    "https://assets.rivalsisland.com/v1/0f7e676d4aefbe101aac583f63476f77feecd95e38a4a9197d9daf8c4c1e5e55/heroes/1034_regular.png",
  ],
  [
    "jeff-the-land-shark",
    "https://assets.rivalsisland.com/v1/2b0969c339c9e1c6fac763200b77137066d9defa66da296af70ab36798dd3f8d/heroes/1047_regular.png",
  ],
  [
    "jubilee",
    "https://assets.rivalsisland.com/v1/36322c1e2b26933b1fa68c6c7b8e83cce803066ed4db6d87d80ea40c6ebc5a16/heroes/1064_regular.png",
  ],
  [
    "loki",
    "https://assets.rivalsisland.com/v1/4ed50890ab99f503def5bc018e321710546bc55cf373e7ec3890dccc1d7e6c87/heroes/1016_regular.png",
  ],
  [
    "luna-snow",
    "https://assets.rivalsisland.com/v1/51b37368a09eff23fc96f09d6305b283d421bb536cd0ba9072ff07534c7f1559/heroes/1031_regular.png",
  ],
  [
    "magik",
    "https://assets.rivalsisland.com/v1/6728800aed5fbbd17589a4f8d55a0086ab758ba657bf0087a456b55bdf449b44/heroes/1029_regular.png",
  ],
  [
    "magneto",
    "https://assets.rivalsisland.com/v1/156494bef4e327d1679b5d61ac43176405a6641e696bc04c3f47b7f0c8a46dd5/heroes/1037_regular.png",
  ],
  [
    "mantis",
    "https://assets.rivalsisland.com/v1/cf465d66234d92f21b49bebce372b61c633620e35b5cc230ab3a438ae0107b3e/heroes/1020_regular.png",
  ],
  [
    "mister-fantastic",
    "https://assets.rivalsisland.com/v1/4c221628a9c0082908dce78108dc0ad3186fec95fcf5ebc96d1f3e98d2b50b4e/heroes/1040_regular.png",
  ],
  [
    "moon-knight",
    "https://assets.rivalsisland.com/v1/9b092a73e51f4afff0a7eb3f4c3bd0d3b909779f37aaa5af722224b2b9b1ea4c/heroes/1030_regular.png",
  ],
  [
    "namor",
    "https://assets.rivalsisland.com/v1/faef4695f39186667f72cf2078c8427c41fd5f572c1ee545aa02149335af3d5b/heroes/1045_regular.png",
  ],
  [
    "peni-parker",
    "https://assets.rivalsisland.com/v1/5bc065a1bee0dc27e24847b194dd503c703f44a75260d83d9b1b16ac9db1548b/heroes/1042_regular.png",
  ],
  [
    "phoenix",
    "https://assets.rivalsisland.com/v1/991a17b463d5f8ccc41be92f74f90c5c3e2151895230917607171c1ef54445a6/heroes/1054_regular.png",
  ],
  [
    "psylocke",
    "https://assets.rivalsisland.com/v1/756627a08435c09d4ee771eb4012bb90c2f7e80f49f6382ead07b514c81d5bcd/heroes/1048_regular.png",
  ],
  [
    "rocket-raccoon",
    "https://assets.rivalsisland.com/v1/d164bf9a2a209946defd0ae1391cd13ff49bb10f52e249b49bb349de7308d05e/heroes/1023_regular.png",
  ],
  [
    "rogue",
    "https://assets.rivalsisland.com/v1/02714702d2e166c59a4e1e1acf2a272e767714063140f66b8d96c074b9d2e90c/heroes/1065_regular.png",
  ],
  [
    "scarlet-witch",
    "https://assets.rivalsisland.com/v1/b1ca0e6ca6672c940344962678423a336adc4ffbf676d1a4f9465d5e938740f1/heroes/1038_regular.png",
  ],
  [
    "spider-man",
    "https://assets.rivalsisland.com/v1/534a8dcc80f814dda01221ab5879f2912cdc5fd526f1303f34f9690fbc31b8d9/heroes/1036_regular.png",
  ],
  [
    "squirrel-girl",
    "https://assets.rivalsisland.com/v1/556bb51c2bb2e7446b0bbdd766d5d39f217c2df7d3fbce80e024410cee4b13a5/heroes/1032_regular.png",
  ],
  [
    "star-lord",
    "https://assets.rivalsisland.com/v1/01e5f4a4ded5986cecab581f9390903f3c1f28fe45542863de039423b06c96e6/heroes/1043_regular.png",
  ],
  [
    "storm",
    "https://assets.rivalsisland.com/v1/6197e050f7d0ac1af2c3fb062583c2bbe09ed6ad51caa3da1cf33a30cf3fce79/heroes/1015_regular.png",
  ],
  [
    "the-hood",
    "https://assets.rivalsisland.com/v1/75431701d7cce8b966a8ae40739339281d7e1a2844e6348d64ccd4f112573282/heroes/1066_regular.png",
  ],
  [
    "the-punisher",
    "https://assets.rivalsisland.com/v1/e8063bf75334fa1d78ff9f69ef619724b73b956d9ed791b0a51227e192428f52/heroes/1014_regular.png",
  ],
  [
    "the-thing",
    "https://assets.rivalsisland.com/v1/e4e9ab7717854329b2343078b8ac948c9ce187badede05b1c2979b6db57f5e55/heroes/1051_regular.png",
  ],
  [
    "thor",
    "https://assets.rivalsisland.com/v1/3928a5d9e420b98d5a2efb0940166b75ecd9611d866c1ef639f1bb29fcbb4b1e/heroes/1039_regular.png",
  ],
  [
    "ultron",
    "https://assets.rivalsisland.com/v1/8a94e0d3b1d2aedd12fe81486e26864274b96fa51eeab75846c2fbfb45acab6f/heroes/1028_regular.png",
  ],
  [
    "venom",
    "https://assets.rivalsisland.com/v1/94ccb68f43f443c2001f4b894242f92ae3dbce3ceb167f7cd56c8966f5f71cfa/heroes/1035_regular.png",
  ],
  [
    "white-fox",
    "https://assets.rivalsisland.com/v1/6e209f4bc1cea92241fbd97a3769241104ec295ad194692dabba71dee4f01363/heroes/1060_regular.png",
  ],
  [
    "winter-soldier",
    "https://assets.rivalsisland.com/v1/1167beab33b681b0d3bbe84c6e9fbb9ad78cd0e083da6c8493133e23096fef59/heroes/1041_regular.png",
  ],
  [
    "wolverine",
    "https://assets.rivalsisland.com/v1/6eb7ba756836ce78c20e43155a5819eab8b57b062ab0f7dfc4ae050265b09eb8/heroes/1049_regular.png",
  ],
]);
