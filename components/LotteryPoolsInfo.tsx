export function LotteryPoolsInfo() {
    const pools = [
        {
            id: 1,
            title: "Pool 1",
            tickets: "15%",
            prize: "20%",
            description: "First tier winners share 20% of the total prize pool.",
            bg: "bg-yellow-50"
        },
        {
            id: 2,
            title: "Pool 2",
            tickets: "7%",
            prize: "25%",
            description: "Second tier winners share 25% of the total prize pool.",
            bg: "bg-red-50"
        },
        {
            id: 3,
            title: "Pool 3",
            tickets: "5%",
            prize: "30%",
            description: "Third tier winners share 30% of the total prize pool.",
            bg: "bg-blue-50"
        },
        {
            id: 4,
            title: "Pool 4",
            tickets: "3%",
            prize: "25%",
            description: "Top tier winners share 25% of the total prize pool.",
            bg: "bg-purple-50"
        }
    ];

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Prize Distribution</h2>
                <p className="text-gray-500">How the prize pool is split among winning tickets</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {pools.map((pool) => (
                    <div
                        key={pool.id}
                        className="relative group p-6 rounded-xl border border-gray-100 hover:border-red-100 hover:shadow-md transition-all duration-300 bg-gradient-to-b from-white to-gray-50/50"
                    >
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{pool.title}</h3>

                        <div className="flex items-center justify-between mt-4 mb-4 p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
                            <div className="text-center">
                                <div className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Tickets</div>
                                <div className="text-lg font-bold text-gray-900">{pool.tickets}</div>
                            </div>
                            <div className="w-px h-8 bg-gray-100"></div>
                            <div className="text-center">
                                <div className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Prize</div>
                                <div className="text-lg font-bold text-red-600">{pool.prize}</div>
                            </div>
                        </div>

                        <p className="text-sm text-gray-500 leading-relaxed">
                            {pool.description}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
