import { Trophy, Search, ChevronDown, User, Sparkles, Medal } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "./ui/table";

const MOCK_LEADERS = [
    { rank: 1, user: "0xd8...8e6c", totalWon: "258,645", winRate: "53.54%", roundsWon: "44528/83175" },
    { rank: 2, user: "SuperBlade", totalWon: "127,587", winRate: "50.57%", roundsWon: "38276/75682" },
    { rank: 3, user: "0xc2...0491", totalWon: "114,954", winRate: "48.15%", roundsWon: "35965/74698" },
    { rank: 4, user: "0xa1...b2c3", totalWon: "98,432", winRate: "55.12%", roundsWon: "21345/38721" },
    { rank: 5, user: "CryptoKing", totalWon: "87,654", winRate: "61.23%", roundsWon: "18543/30284" },
    { rank: 6, user: "0xff...00aa", totalWon: "76,543", winRate: "49.88%", roundsWon: "28432/57001" },
    { rank: 7, user: "MoonWalker", totalWon: "65,432", winRate: "52.45%", roundsWon: "15432/29423" },
    { rank: 8, user: "0x12...3456", totalWon: "54,321", winRate: "47.99%", roundsWon: "22134/46123" },
];

export function Leaderboard() {
    const topThree = MOCK_LEADERS.slice(0, 3);
    const others = MOCK_LEADERS.slice(3);

    return (
        <div className="w-full relative overflow-hidden">
            {/* Ambient Background Blobs (Matches LotteryHero) */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-red-50 dark:bg-red-900/10 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
            <div className="absolute top-40 left-0 -ml-10 w-64 h-64 bg-orange-50 dark:bg-orange-900/10 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

            {/* Header Section */}
            <div className="mb-8 relative z-10">
                <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight mb-8">
                    Prediction <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-600 dark:from-red-500 dark:to-orange-500">Winners</span>
                </h1>

                {/* Filters Row */}
                <div className="bg-white dark:bg-zinc-950 p-4 rounded-3xl border border-gray-200 dark:border-zinc-800 flex flex-wrap gap-4 items-center justify-between shadow-sm">
                    <div className="flex flex-wrap gap-4">

                        {/* BTC */}
                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-zinc-900 rounded-xl cursor-pointer border border-gray-100 dark:border-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
                            <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-[10px] font-bold text-white border-2 border-white dark:border-zinc-900 shadow-sm">
                                ₿
                            </div>
                            <span className="font-bold text-sm text-gray-700 dark:text-gray-200">BTC</span>
                        </div>

                        {/* ETH */}
                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-zinc-900 rounded-xl cursor-pointer border border-gray-100 dark:border-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
                            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white border-2 border-white dark:border-zinc-900 shadow-sm">
                                Ξ
                            </div>
                            <span className="font-bold text-sm text-gray-700 dark:text-gray-200">ETH</span>
                        </div>

                        {/* Rank By */}
                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-zinc-900 rounded-xl cursor-pointer border border-gray-100 dark:border-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
                            <span className="font-bold text-sm text-gray-700 dark:text-gray-200">Rank By: Total Won</span>
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative w-full sm:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search address"
                            className="w-full sm:w-64 pl-9 pr-4 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-medium focus:ring-2 focus:ring-red-500 focus:outline-none text-gray-900 dark:text-white placeholder-gray-500"
                        />
                    </div>
                </div>
            </div>

            {/* Top 3 Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 items-end relative z-10">
                {/* Number 2 (Silver) - Left */}
                {topThree[1] && (
                    <div className="bg-white dark:bg-zinc-950 rounded-3xl p-6 border border-gray-200 dark:border-zinc-800 shadow-xl relative overflow-hidden order-2 md:order-1 h-[280px] flex flex-col justify-between group hover:border-gray-300 dark:hover:border-zinc-700 transition-all">
                        {/* Silver Gradient Top Border */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-300 to-gray-400 opacity-50"></div>

                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                            <Trophy className="w-32 h-32" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-black text-gray-600 dark:text-gray-300 shadow-inner">
                                    2
                                </div>
                                <h3 className="text-xl font-black truncate text-gray-800 dark:text-white">{topThree[1].user}</h3>
                            </div>
                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 dark:bg-zinc-900 rounded-lg text-xs font-bold text-gray-500 dark:text-gray-400">
                                <User className="w-3 h-3" /> Silver Tier
                            </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-zinc-900">
                            <div className="flex justify-between text-sm items-center">
                                <span className="text-gray-500 dark:text-gray-400 font-medium">Win Rate</span>
                                <span className="font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-zinc-900 px-2 py-1 rounded">{topThree[1].winRate}</span>
                            </div>
                            <div className="flex justify-between text-sm items-center">
                                <span className="text-gray-500 dark:text-gray-400 font-medium">Net Winnings</span>
                                <span className="font-bold text-green-600 dark:text-green-500">+{topThree[1].totalWon}</span>
                            </div>
                            <div className="flex justify-between text-sm items-center">
                                <span className="text-gray-500 dark:text-gray-400 font-medium">Rounds Won</span>
                                <span className="font-bold text-gray-900 dark:text-white">{topThree[1].roundsWon}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Number 1 (Gold) - Center */}
                {topThree[0] && (
                    <div className="bg-white dark:bg-zinc-950 rounded-3xl p-8 border border-yellow-200 dark:border-yellow-900/30 shadow-2xl shadow-yellow-500/5 relative overflow-hidden order-1 md:order-2 h-[340px] flex flex-col justify-between z-10 transform hover:-translate-y-1 transition-transform duration-300">
                        {/* Gold Gradient Top Border */}
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400"></div>

                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Trophy className="w-40 h-40 text-yellow-500" />
                        </div>
                        <div className="absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rotate-45 flex items-end justify-center pb-2 shadow-lg">
                            <span className="text-white font-black text-2xl rotate-[-45deg] absolute bottom-3 left-8 shadow-sm">1</span>
                        </div>

                        <div className="mt-2">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-12 h-12 rounded-full bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center text-2xl shadow-sm border border-yellow-100 dark:border-yellow-900/30">
                                    👑
                                </div>
                                <h3 className="text-2xl font-black truncate text-gray-900 dark:text-white tracking-tight">{topThree[0].user}</h3>
                            </div>
                            <div className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-500 rounded-lg text-xs font-bold border border-yellow-100 dark:border-yellow-900/30">
                                <Sparkles className="w-3 h-3" /> Grand Champion
                            </div>
                        </div>

                        <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-zinc-900">
                            <div className="flex justify-between text-sm items-center">
                                <span className="text-gray-500 dark:text-gray-400 font-medium">Win Rate</span>
                                <span className="font-black text-gray-900 dark:text-white text-lg bg-gray-50 dark:bg-zinc-900 px-3 py-1 rounded-lg border border-gray-100 dark:border-zinc-800">{topThree[0].winRate}</span>
                            </div>
                            <div className="flex justify-between text-sm items-center">
                                <span className="text-gray-500 dark:text-gray-400 font-medium">Net Winnings</span>
                                <span className="font-black text-green-600 dark:text-green-500 text-lg">+{topThree[0].totalWon}</span>
                            </div>
                            <div className="flex justify-between text-sm items-center">
                                <span className="text-gray-500 dark:text-gray-400 font-medium">Rounds Won</span>
                                <span className="font-black text-gray-900 dark:text-white text-lg">{topThree[0].roundsWon}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Number 3 (Bronze) - Right */}
                {topThree[2] && (
                    <div className="bg-white dark:bg-zinc-950 rounded-3xl p-6 border border-gray-200 dark:border-zinc-800 shadow-xl relative overflow-hidden order-3 h-[280px] flex flex-col justify-between group hover:border-orange-200 dark:hover:border-orange-900/30 transition-all">
                        {/* Bronze Gradient Top Border */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-300 to-orange-400 opacity-50"></div>

                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                            <Trophy className="w-32 h-32 text-orange-700" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center font-black text-orange-700 dark:text-orange-600 shadow-inner">
                                    3
                                </div>
                                <h3 className="text-xl font-black truncate text-gray-800 dark:text-white">{topThree[2].user}</h3>
                            </div>
                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 dark:bg-zinc-900 rounded-lg text-xs font-bold text-gray-500 dark:text-gray-400">
                                <User className="w-3 h-3" /> Bronze Tier
                            </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-zinc-900">
                            <div className="flex justify-between text-sm items-center">
                                <span className="text-gray-500 dark:text-gray-400 font-medium">Win Rate</span>
                                <span className="font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-zinc-900 px-2 py-1 rounded">{topThree[2].winRate}</span>
                            </div>
                            <div className="flex justify-between text-sm items-center">
                                <span className="text-gray-500 dark:text-gray-400 font-medium">Net Winnings</span>
                                <span className="font-bold text-green-600 dark:text-green-500">+{topThree[2].totalWon}</span>
                            </div>
                            <div className="flex justify-between text-sm items-center">
                                <span className="text-gray-500 dark:text-gray-400 font-medium">Rounds Won</span>
                                <span className="font-bold text-gray-900 dark:text-white">{topThree[2].roundsWon}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Table */}
            <div className="bg-white dark:bg-zinc-950 rounded-3xl overflow-hidden border border-gray-200 dark:border-zinc-800 shadow-xl relative z-10">
                <div className="px-8 py-6 border-b border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 flex justify-between items-center">
                    <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-3">
                        <Medal className="w-5 h-5 text-red-500" />
                        All Rankings
                    </h3>
                </div>
                <Table>
                    <TableHeader className="bg-gray-50 dark:bg-zinc-900/30">
                        <TableRow className="hover:bg-transparent border-gray-200 dark:border-zinc-800">
                            <TableHead className="w-[100px] pl-8 h-12 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Rank</TableHead>
                            <TableHead className="h-12 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">User</TableHead>
                            <TableHead className="text-right h-12 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Won</TableHead>
                            <TableHead className="text-right h-12 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Win Rate</TableHead>
                            <TableHead className="text-right pr-8 h-12 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Rounds Played</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {others.map((leader) => (
                            <TableRow key={leader.rank} className="border-gray-100 dark:border-zinc-800/50 hover:bg-red-50/50 dark:hover:bg-red-900/5 transition-colors group cursor-pointer">
                                <TableCell className="font-black pl-8 text-gray-900 dark:text-white">
                                    <span className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-sm group-hover:bg-red-100 dark:group-hover:bg-red-900/30 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                                        #{leader.rank}
                                    </span>
                                </TableCell>
                                <TableCell className="font-mono text-sm text-gray-600 dark:text-gray-300 font-bold group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                                    {leader.user}
                                </TableCell>
                                <TableCell className="text-right font-black text-green-600 dark:text-green-500">
                                    +{leader.totalWon}
                                </TableCell>
                                <TableCell className="text-right text-gray-600 dark:text-gray-400 font-medium">
                                    {leader.winRate}
                                </TableCell>
                                <TableCell className="text-right pr-8 text-gray-600 dark:text-gray-400 font-medium">
                                    {leader.roundsWon}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
