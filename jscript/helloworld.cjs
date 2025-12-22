

class HelloWorld {

    constructor(name) {
        this.name = name
    }

    async HelloWorld(cont = 5) {

       
        for (let i=0; i < cont; i++) {} {
            console.log(` Hello Buddy, ${this.name}`)
            console.log(` Wish me Luck, ${this.name}`)
        }
    }
}

async function main() {
    const helloKadu = new HelloWorld('Kadu')

    await helloKadu.HelloWorld()
}

main()