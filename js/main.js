class WeatherApp {
	constructor(json) {
		this.#init(json)
		this.render()
	}

	static async create() {
		function formatDate(date) {
			const d = String(date.getDate()).padStart(2, '0')
			const m = String(date.getMonth() + 1).padStart(2, '0')
			const y = date.getFullYear()
			return `${d}-${m}-${y}`
		}
		const date = new Date()
		const startDateTxt = formatDate(date)
		date.setDate(date.getDate + 14)
		const endDateTxt = formatDate(date)

		const latitude = 56.8519
		const longitude = 60.6122
		const response = await fetch(
			`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&timezone=Asia/Yekaterinburg&current=temperature_2m,wind_speed_10m,precipitation_probability,relative_humidity_2m,weather_code&hourly=temperature_2m,wind_speed_10m,precipitation_probability,relative_humidity_2m,weather_code&start-date=${startDateTxt}&end-date-${endDateTxt}`
		)
		const json = await response.json()

		return new WeatherApp(json)
	}

	#init(json) {
		this.days = this.#getDays(json)
		this.curHour = this.#getCurHour(json)

		const dom = new DOM()
		this.blockTemplate = dom.getElement('data-weather-block-template')
		this.blocksContainer = dom.getElement('data-blocks-container')
		this.headerWeatherIcon = dom.getElement('data-header-weather-icon')
		this.headerTemperature = dom.getElement('data-header-temperature')
		this.headerWeekDay = dom.getElement('data-header-week-day')
		this.headerHour = dom.getElement('data-header-hour')
		this.headerPrecipitation = dom.getElement('data-precipitation')
		this.headerHumidity = dom.getElement('data-humidity')
		this.headerWind = dom.getElement('data-wind')
		this.headerWeatherDescription = dom.getElement(
			'data-header-weather-description'
		)
		this.headerWeatherIcon = dom.getElement('data-header-weather-icon')
	}

	render() {
		this.blocksContainer.innerHTML = ''

		this.days.forEach((day) => {
			this.blocksContainer.appendChild(this.#getWeatherBlockByDay(day))
		})

		this.headerTemperature.textContent = Math.round(
			this.curHour.temperature
		)
		this.headerWeekDay.textContent = this.days[0].name.full
		this.headerHour.textContent = new Date().getHours()
		this.headerPrecipitation.textContent = this.curHour.precipitation
		this.headerHumidity.textContent = this.curHour.humidity
		this.headerWind.textContent = Math.round(this.curHour.wind)
		this.headerWeatherDescription.textContent =
			codeMap[this.curHour.code].name
		this.headerWeatherIcon.src = codeMap[this.curHour.code].imgPath
	}

	#getWeatherBlockByDay(day) {
		const weatherBlock = this.blockTemplate.content.cloneNode(true)

		weatherBlock.querySelector('[data-week-day]').textContent =
			day.name.brief
		weatherBlock.querySelector('[data-weather-icon]').src =
			day.frequentCodeInterpolation.imgPath
		weatherBlock.querySelector('[data-day-temperature]').textContent =
			day.avgDayTemperature
		weatherBlock.querySelector('[data-night-temperature]').textContent =
			day.avgNightTemperature

		return weatherBlock
	}

	#getDays(json) {
		const hourly = json.hourly
		let hourIdx = 0
		const days = []
		let hours = []
		for (let i = 0; i < 7; i++) {
			hours = []
			for (let j = 0; j < 24; j++) {
				hours.push(
					new Hour(
						hourly.temperature_2m[hourIdx],
						hourly.precipitation_probability[hourIdx],
						hourly.relative_humidity_2m[hourIdx],
						hourly.wind_speed_10m[hourIdx],
						hourly.weather_code[hourIdx]
					)
				)
				hourIdx++
			}

			hourIdx--
			days.push(new Day(new Date(hourly.time[hourIdx]), hours))
		}

		return days
	}

	#getCurHour(json) {
		const current = json.current

		const curHour = new Hour(
			current.temperature_2m,
			current.precipitation_probability,
			current.relative_humidity_2m,
			current.wind_speed_10m,
			current.weather_code
		)

		return curHour
	}
}

class DOM {
	getElement(dataName) {
		return document.querySelector('[' + dataName + ']')
	}
}

class Day {
	#weekDayMap = {
		0: { brief: 'вс', full: 'Воскресенье' },
		1: { brief: 'пн', full: 'Понедельник' },
		2: { brief: 'вт', full: 'Вторник' },
		3: { brief: 'ср', full: 'Среда' },
		4: { brief: 'чт', full: 'Четверг' },
		5: { brief: 'пт', full: 'Пятница' },
		6: { brief: 'сб', full: 'Суббота' },
	}

	constructor(date, hours) {
		this.date = date
		this.hours = hours
	}

	get name() {
		return this.#weekDayMap[this.date.getDay()]
	}

	get avgDayTemperature() {
		let result = 0
		for (let i = 9; i < 24; i++) {
			result += this.hours[i].temperature
		}
		return Math.round(result / 15)
	}

	get avgNightTemperature() {
		let result = 0
		for (let i = 0; i < 9; i++) {
			result += this.hours[i].temperature
		}
		return Math.round(result / 9)
	}

	get frequentCodeInterpolation() {
		const codes = {}

		this.hours.forEach((hour) => {
			if (!(hour.code in codes)) {
				codes[hour.code] = 1
			} else {
				codes[hour.code]++
			}
		})

		return codeMap[Math.max(...Object.keys(codes))]
	}
}

class Hour {
	constructor(temperature, precipitation, humidity, wind, code) {
		this.temperature = temperature
		this.precipitation = precipitation
		this.humidity = humidity
		this.wind = wind
		this.code = code
	}

	get codeInterpretation() {
		return this.getInterpretationByCode(this.code)
	}

	getInterpretationByCode(code) {
		return codeMap[code]
	}
}

const codeMap = {
	0: {
		name: 'Ясное небо',
		imgPath: 'https://openweathermap.org/img/wn/01d@2x.png',
	},
	1: {
		name: 'В основном ясно',
		imgPath: 'https://openweathermap.org/img/wn/02d@2x.png',
	},
	2: {
		name: 'Переменная облачность',
		imgPath: 'https://openweathermap.org/img/wn/03d@2x.png',
	},
	3: {
		name: 'Пасмурно',
		imgPath: 'https://openweathermap.org/img/wn/04d@2x.png',
	},
	45: {
		name: 'Туман',
		imgPath: 'https://openweathermap.org/img/wn/50d@2x.png',
	},
	48: {
		name: 'Оседающий иней',
		imgPath: 'https://openweathermap.org/img/wn/50d@2x.png',
	},
	51: {
		name: 'Морось: слабая',
		imgPath: 'https://openweathermap.org/img/wn/09d@2x.png',
	},
	53: {
		name: 'Морось: умеренная',
		imgPath: 'https://openweathermap.org/img/wn/09d@2x.png',
	},
	55: {
		name: 'Морось: интенсивная',
		imgPath: 'https://openweathermap.org/img/wn/09d@2x.png',
	},
	56: {
		name: 'Замерзающая морось: слабая',
		imgPath: 'https://openweathermap.org/img/wn/09d@2x.png',
	},
	57: {
		name: 'Замерзающая морось: плотная интенсивность',
		imgPath: 'https://openweathermap.org/img/wn/09d@2x.png',
	},
	61: {
		name: 'Дождь: слабый',
		imgPath: 'https://openweathermap.org/img/wn/10d@2x.png',
	},
	63: {
		name: 'Дождь: умеренный',
		imgPath: 'https://openweathermap.org/img/wn/10d@2x.png',
	},
	65: {
		name: 'Дождь: сильный',
		imgPath: 'https://openweathermap.org/img/wn/10d@2x.png',
	},
	66: {
		name: 'Ледяной дождь: слабой интенсивности',
		imgPath: 'https://openweathermap.org/img/wn/10d@2x.png',
	},
	67: {
		name: 'Ледяной дождь: сильной интенсивности',
		imgPath: 'https://openweathermap.org/img/wn/10d@2x.png',
	},
	71: {
		name: 'Снегопад: слабый',
		imgPath: 'https://openweathermap.org/img/wn/13d@2x.png',
	},
	73: {
		name: 'Снегопад: умеренный',
		imgPath: 'https://openweathermap.org/img/wn/13d@2x.png',
	},
	75: {
		name: 'Снегопад: сильный',
		imgPath: 'https://openweathermap.org/img/wn/13d@2x.png',
	},
	77: {
		name: 'Снежные зерна',
		imgPath: 'https://openweathermap.org/img/wn/13d@2x.png',
	},
	80: {
		name: 'Ливневые дожди: слабые',
		imgPath: 'https://openweathermap.org/img/wn/09d@2x.png',
	},
	81: {
		name: 'Ливневые дожди: умеренные',
		imgPath: 'https://openweathermap.org/img/wn/09d@2x.png',
	},
	82: {
		name: 'Ливневые дожди: сильные',
		imgPath: 'https://openweathermap.org/img/wn/09d@2x.png',
	},
	85: {
		name: 'Снежные ливни: небольшие',
		imgPath: 'https://openweathermap.org/img/wn/13d@2x.png',
	},
	86: {
		name: 'Снежные ливни: сильные',
		imgPath: 'https://openweathermap.org/img/wn/13d@2x.png',
	},
	95: {
		name: 'Гроза: слабая или умеренная',
		imgPath: 'https://openweathermap.org/img/wn/11d@2x.png',
	},
	96: {
		name: 'Гроза с небольшим градом',
		imgPath: 'https://openweathermap.org/img/wn/11d@2x.png',
	},
	99: {
		name: 'Гроза с сильным градом',
		imgPath: 'https://openweathermap.org/img/wn/11d@2x.png',
	},
}

WeatherApp.create()
