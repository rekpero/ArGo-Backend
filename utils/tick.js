class Tick
{
    startTime = 0;

    start = () => {
        this.startTime = Date.now();
    }

    end = () => {
        const buildTime = Date.now() - this.startTime;
        return buildTime;
    }
}

module.exports = Tick;