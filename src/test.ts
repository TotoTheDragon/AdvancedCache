import moment from "moment";
import { Cache } from ".";

const delay = ms => new Promise(res => setTimeout(res, ms));

const cache: Cache<string> = new Cache({ cacheDuration: moment.duration(20, "second"), autoClean: false, autoCleanInterval: moment.duration(1, "second") });

process.stdin.on("data", async data => {

    const args: string[] = data.toString().trim().split(" ");
    const command: string = args.shift();
    switch (command) {
        case "show":
            console.log(cache.values());
            break;
        case "showp":
            console.log(cache.promises());
            break;
        case "showa":
            console.log(cache.values(), cache.promises());
            break;
        case "add":
            cache.add(args.shift(), args.join(" "));
            break;
        case "get":
            console.log(await cache.get(args.shift()));
            break;
        case "promise":
            cache.add(args.shift(), new Promise(async res => {
                await delay(5000);
                return res(args.join(" "));
            }));
            break;
    }
});