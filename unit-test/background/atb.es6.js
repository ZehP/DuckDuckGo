const atb = require('../../shared/js/background/atb.es6')
const settings = require('../../shared/js/background/settings.es6')
const load = require('../../shared/js/background/load.es6')
const browserWrapper = require('../../shared/js/background/chrome-wrapper.es6')

const settingHelper = require('../helpers/settings.es6')

// HELPERS

const stubLoadJSON = (ops) => {
    return spyOn(load, 'JSONfromExternalFile').and.callFake((url, cb) => {
        if (url.match(/duckduckgo\.com\/atb\.js/)) {
            cb({ version: ops.returnedAtb }) // eslint-disable-line standard/no-callback-literal
        } else {
            cb()
        }
    })
}

// ACTUAL TESTS

describe('atb.canShowPostInstall()', () => {
    const canShowAtbCases = [
        {
            domain: 'duckduckgo.com/software',
            result: false
        }, {
            domain: 'duckduckgo.com/app',
            result: false
        }, {
            domain: undefined,
            result: false
        }, {
            domain: 'duckduckgo.com/about',
            result: true
        }, {
            domain: 'duckduckgo.com',
            result: true
        }
    ]

    canShowAtbCases.forEach((test) => {
        it(`should return ${test.result} when the domain is: '${test.domain}'`, () => {
            settingHelper.stub({ hasSeenPostInstall: false })

            const result = atb.canShowPostInstall(test.domain)
            expect(result).toBe(test.result)
        })
    })
})

describe('atb.redirectURL()', () => {
    let tests = [
        { url: 'http://duckduckgo.com/?q=something', rewrite: true },
        { url: 'https://duckduckgo.com/?q=something', rewrite: true },
        { url: 'https://duckduckgo.com/?q=something&atb=v70-1', rewrite: false },
        { url: 'https://duckduckgo.com/?q=atb', rewrite: true },
        { url: 'https://duckduckgo.com/js/spice/forecast/Denver%20Colorado%20United%20States/en', rewrite: false },
        { url: 'https://twitter.com', rewrite: false },
        { url: 'https://twitter.com/?u=duckduckgo.com', rewrite: false },
        { url: 'https://icons.duckduckgo.com/ip2/weather.com.ico', rewrite: false },
        { url: 'https://duckduckgo.com/t/ias_meanings?6753163&q=weather&ct=US&d=m&kl=wt-wt', rewrite: false },
        { url: 'https://duckduckgo.com/share/spice/forecast/1347/forecast.css', rewrite: false },
        { url: 'https://duckduckgo.com/t/iaui?7725756&oi=forecast&r0=forecast&r1=forecast&r2=forecast&r5=en_wikipedia_queries,nlp_fathead,nlp_wiki&r8=news&r16=news&r19=forecast&r28=apps_domains&q=weather&ct=US&d=m&kl=wt-wt', rewrite: false },
        { url: 'https://www.reddit.com/search?q=duckduckgo', rewrite: false },
        { url: 'https://duckduckgo.com/?q=whois+https://duckduckgo.com/?q=whois', rewrite: true },
        { url: 'https://beta.duckduckgo.com/t/ias_meanings?6753163&q=weather&ct=US&d=m&kl=wt-wt', rewrite: false },
        { url: 'https://beta.duckduckgo.com/share/spice/forecast/1347/forecast.css', rewrite: false },
        { url: 'http://beta.duckduckgo.com/?q=something', rewrite: true },
        { url: 'https://beta.duckduckgo.com/?q=something', rewrite: true },
        { url: 'https://beta.duckduckgo.com/?q=something&atb=v70-1', rewrite: false }
    ]

    beforeEach(() => {
        settingHelper.stub({ atb: 'v123-4ab' })
    })

    tests.forEach((test) => {
        it(`should${test.rewrite ? '' : ' not'} rewrite url: ${test.url}`, () => {
            let result = atb.redirectURL({ url: test.url })

            if (test.rewrite) {
                expect(result.redirectUrl).toBeTruthy()
            } else {
                expect(result).toBeFalsy()
            }
        })
    })

    let correctUrlTests = [
        {url: 'https://duckduckgo.com/?q=something', expected: 'https://duckduckgo.com/?q=something&atb=v123-4ab'},
        {url: 'https://duckduckgo.com/about#newsletter', expected: 'https://duckduckgo.com/about?atb=v123-4ab#newsletter'}
    ]

    correctUrlTests.forEach((test) => {
        it(`should rewrite ${test.url} correctly`, () => {
            expect(atb.redirectURL({ url: test.url }).redirectUrl).toEqual(test.expected)
        })
    })
})

describe('atb.setInitialVersions()', () => {
    it('should grab the version from the ATB service and save it to settings', () => {
        settingHelper.stub({ atb: null })
        stubLoadJSON({ returnedAtb: 'v111-4' })

        atb.setInitialVersions()

        expect(settings.getSetting('atb')).toEqual('v111-4')
    })

    it('should bail if the version has already been set', () => {
        settingHelper.stub({ atb: 'v111-5' })
        let loadJSONSpy = stubLoadJSON({ returnedAtb: 'v111-6' })

        atb.setInitialVersions()

        expect(loadJSONSpy).not.toHaveBeenCalled()
        expect(settings.getSetting('atb')).toEqual('v111-5')
    })

    it('should be able to handle the server being down correctly')
})

describe('atb.updateSetAtb()', () => {
    it('should hit atb service with atb and set_atb when both are set', (done) => {
        settingHelper.stub({ atb: 'v111-2', set_atb: 'v111-6' })
        let loadJSONSpy = stubLoadJSON({ returnedAtb: 'v112-2' })

        atb.updateSetAtb().then(() => {
            expect(loadJSONSpy).toHaveBeenCalledWith(jasmine.stringMatching(/atb=v111-2&set_atb=v111-6/), jasmine.any(Function))
            expect(settings.getSetting('atb')).toEqual('v111-2')

            done()
        })
    })

    it('should be able to handle cases where atb is null')
    it('should be able to handle cases where set_atb is null')
})

describe('atb.setAtbValuesFromSuccessPage()', () => {
    it('should call /exti with the atb param', () => {
        settingHelper.stub()
        let loadJSONSpy = spyOn(load, 'JSONfromExternalFile')

        atb.setAtbValuesFromSuccessPage('v123-4ab')

        expect(settings.getSetting('atb')).toEqual('v123-4ab')
        expect(settings.getSetting('set_atb')).toEqual('v123-4ab')
        expect(loadJSONSpy).toHaveBeenCalledWith('https://duckduckgo.com/exti/?atb=v123-4ab', jasmine.any(Function))
    })

    it('should not overwrite an existing atb param if the page sends a blank one')
})

describe('atb.inject()', () => {
    it('should inject the scripts when tabs are found', () => {
        spyOn(browserWrapper, 'getTabsByURL').and.callFake((filter, cb) => {
            cb([{id: 17}]) // eslint-disable-line standard/no-callback-literal
        })
        let scriptSpy = spyOn(browserWrapper, 'executeScript')
        let cssSpy = spyOn(browserWrapper, 'insertCSS')

        atb.inject()

        expect(scriptSpy).toHaveBeenCalledWith(17, '/public/js/content-scripts/on-install.js')
        expect(cssSpy).toHaveBeenCalledWith(17, '/public/css/noatb.css')
    })
})
