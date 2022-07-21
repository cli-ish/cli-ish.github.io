class Listener {
    /**
     * Construct Listener
     * @param {HTMLElement} input
     * @param {HTMLElement} output
     */
    constructor(input, output) {
        this.input = input;
        this.output = output;
    }

    /**
     * Attach textarea listener
     */
    attachListenEvent() {
        let that = this;
        this.input.addEventListener('input', function () {
            that.#convert();
        });
    }

    /**
     * Convert code to obfuscated code
     */
    #convert() {
        let rawphpcode = this.input.value.split('\n');
        let validphp = new RegExp('\\);$');
        let endspace = new RegExp('[ \t]+$');
        let startspace = new RegExp('^[ \t]+');
        let spacecontain = new RegExp('[ \t]+');
        let variableMap = {};
        let generator = new Generator();
        rawphpcode.every(function (line, index) {
            if (!line.match(validphp)) {
                console.log("invalid line: " + index.toString());
                return false;
            }
            let variable = null;
            let indexVar = -1;
            if (line[0] === '$') {
                indexVar = line.indexOf('=', 1);
                variable = line.slice(1, indexVar).replace(spacecontain, '');
            }
            let indexFunc = line.indexOf('(', indexVar);
            let func = line.slice(indexVar + 1, indexFunc);
            let args = line.slice(indexFunc + 1, line.length - 2).split(',');
            args.forEach(function (v, i) {
                v = v.replace(endspace, '');
                v = v.replace(startspace, '');
                if (v[0] === "'" || v[0] === '"') {
                    args[i] = v.slice(1, v.length - 1);
                } else if (v[0] === "$") {
                    args[i] = new PhpVariable(variableMap[v.slice(1, v.length).replace(spacecontain, '')]);
                } else if (v.toLowerCase() === 'true' || v.toLowerCase() === 'false') {
                    args[i] = v.toLowerCase() === 'true';
                } else {
                    args[i] = parseInt(v);
                }
            });
            if (variable !== null) {
                variableMap[variable] = generator.call(func, args, true);
            } else {
                generator.call(func, args);
            }
            return true;
        });
        this.output.value = generator.out();
        Generator.resetCounters();
    }
}

class PhpVariable {
    static #c = 3;
    fieldname = "";
    fieldcontent = "";
    suboptions = [];

    /**
     *
     * @param {string} field
     * @param {array} suboptions
     */
    constructor(field, suboptions = []) {
        let data = "$_" + PhpVariable.#c + "=";
        Array.from(field).forEach(function (char) {
            data += '$_(' + Generator.ordoct(char) + ').';
        });
        this.fieldcontent = data.replace(new RegExp('\.$'), '') + ';'
        this.fieldname = '$_' + PhpVariable.#c;
        this.suboptions = suboptions;
        PhpVariable.#c++;
    }

    /**
     * Get sub options
     * @returns {string}
     */
    getSubOptions() {
        let out = '';
        this.suboptions.forEach(function (suboption) {
            if (Number.isInteger(suboption)) {
                out += '[' + suboption + ']';
            } else if (typeof suboption === 'string' || suboption instanceof String) {
                let field = '';
                Array.from(suboption).forEach(function (char) {
                    field += '$_(' + Generator.ordoct(char) + ').';
                });
                out += '[' + field.replace(new RegExp('\.$'), '') + ']';
            } else if (typeof suboption == "boolean") {
                out += '[' + (suboption === true ? '1' : '0') + ']';
            }
        });
        return out;
    }

    /**
     * Reset php variable counter
     */
    static resetCounter() {
        PhpVariable.#c = 3;
    }
}

class Generator {
    #fieldcount = 3;
    #fields = [];
    #out = '<?=0;$_=1/0..-1.2.[];$_=($_[1].$_[2]^$_[3].$_[5]).$_[8];';
    #calls = [];

    /**
     * Generated Output
     * @returns {string}
     */
    out() {
        let tmp = this.#out;
        this.#fields.forEach(function (param) {
            if (param instanceof PhpVariable) {
                tmp += param.fieldcontent;
            }
        });
        this.#calls.forEach(function (call) {
            tmp += call;
        });
        return tmp;
    }

    /**
     * get an octal or deci value of the char
     * @param char
     * @returns {string|number}
     */
    static ordoct(char) {
        let ord = char.charCodeAt(0);
        return Math.random() < 0.5 ? '0' + ord.toString(8) : ord;
    }

    /**
     * Set a variable as field
     * @param {PhpVariable} field
     */
    addField(field) {
        this.#fields.push(field);
    }

    /**
     * Add a call to the generator
     * @param {string} call
     * @param {array} params
     * @param {boolean} returnResult
     * @returns {string}
     */
    call(call, params, returnResult = false) {
        let that = this;
        params.forEach(function (param) {
            if (param instanceof PhpVariable) {
                that.addField(param);
            }
        });
        let obfuscated = '';
        if (returnResult) {
            obfuscated += '$__' + this.#fieldcount + '=';
            this.#fieldcount++;
        }
        obfuscated += '(';
        Array.from(call).forEach(function (char) {
            obfuscated += '$_(' + Generator.ordoct(char) + ').';
        });
        obfuscated = obfuscated.replace(new RegExp('\.$'), '') + ')(';
        params.forEach(function (param) {
            if (Number.isInteger(param)) {
                obfuscated += param;
            } else if (typeof param === 'string' || param instanceof String) {
                Array.from(param).forEach(function (char) {
                    obfuscated += '$_(' + Generator.ordoct(char) + ').';
                });
                obfuscated = obfuscated.replace(new RegExp('\.$'), '');
            } else if (param instanceof PhpVariable) {
                obfuscated += '${' + param.fieldname + '}' + param.getSubOptions();
            } else if (typeof param == "boolean") {
                obfuscated += param === true ? '1' : '0';
            }
            obfuscated += ',';
        });
        obfuscated = obfuscated.replace(new RegExp(',$'), '') + ');';
        this.#calls.push(obfuscated);
        if (!returnResult) {
            return '';
        }
        return '__' + (this.#fieldcount - 1);
    }

    /**
     * Reset generator counter
     */
    static resetCounters() {
        PhpVariable.resetCounter()
    }
}


document.addEventListener('DOMContentLoaded', function () {
    let input = document.getElementById('simpleshell');
    let output = document.getElementById('simpleshellout');
    let generator = new Listener(input, output);
    generator.attachListenEvent();
});