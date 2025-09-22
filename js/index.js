    // --- Настройки ---
    const API_KEY = 'b9c7a39819f9eb5414ec508177838d60' ; //  ключ OpenWeatherMap
    const CURRENT_URL = 'https://api.openweathermap.org/data/2.5/weather';
    const FORECAST_URL = 'https://api.openweathermap.org/data/2.5/forecast';

    // Элементы страницы
    const cityInput = document.getElementById('cityInput');
    const searchBtn = document.getElementById('searchBtn');
    const saveBtn = document.getElementById('saveBtn');
    const errorBox = document.getElementById('error');

    const cityNameEl = document.getElementById('cityName');
    const descEl = document.getElementById('desc');
    const tempEl = document.getElementById('temp');
    const humidityEl = document.getElementById('humidity');
    const windEl = document.getElementById('wind');
    const weatherIconEl = document.getElementById('weatherIcon');
    const forecastGrid = document.getElementById('forecastGrid');


    // --- Вспомогательные функции ---

    // Преобразовать температуру из Кельвинов в Цельсии и округлить
    function kelvinToCelsius(k){
      return Math.round(k - 273.15);
    }

    // Показать сообщение об ошибке пользователю
    function showError(msg){
      errorBox.textContent = msg;
      errorBox.style.display = 'block';
    }
    function clearError(){
      errorBox.style.display = 'none';
      errorBox.textContent = '';
    }

    // Сохранение/чтение последнего города в localStorage (супер-фича)
    function saveLastCity(city){
      try{
        localStorage.setItem('weather_last_city', city);
      }catch(e){
        //  ignore localStorage errors
      }
    }
    function loadLastCity(){
      try{
        return localStorage.getItem('weather_last_city');
      }catch(e){
        return null;
      }
    }

    // Получить описание 
    function capitalize(s){
      if(!s) return s;
      return s[0].toUpperCase() + s.slice(1);
    }

    // Отобразить иконку: используем иконки OpenWeather и запасную иконку FontAwesome
    function setWeatherIcon(iconCode, main){
      // Если пришёл код иконки от OpenWeather, используем картинку
      if(iconCode){
        const url = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
        weatherIconEl.innerHTML = `<img src="${url}" alt="${main}" width="84" height="84" style="display:block;margin:auto" />`;
        return;
      }
      // fallback:  иконка от FontAwesome 
      const map = {
        "Clear":"<i class='fa-solid fa-sun' style='font-size:42px'></i>",
        "Clouds":"<i class='fa-solid fa-cloud' style='font-size:42px'></i>",
        "Rain":"<i class='fa-solid fa-cloud-showers-heavy' style='font-size:42px'></i>",
        "Snow":"<i class='fa-solid fa-snowflake' style='font-size:42px'></i>",
        "Thunderstorm":"<i class='fa-solid fa-bolt' style='font-size:42px'></i>",
        "Mist":"<i class='fa-solid fa-smog' style='font-size:42px'></i>"
      };
      weatherIconEl.innerHTML = map[main] || "<i class='fa-solid fa-cloud-sun' style='font-size:42px'></i>";
    }

    // --- Основные запросы к API  ---

    // Получаем текущую погоду по названию города
    async function fetchCurrentWeather(city){
      const url = `${CURRENT_URL}?q=${encodeURIComponent(city)}&appid=${API_KEY}`;
      const res = await fetch(url);
      if(!res.ok){
        const data = await res.json().catch(()=>null);
        const message = data && data.message ? data.message : `Ошибка: ${res.status}`;
        throw new Error(message);
      }
      const data = await res.json();
      return data;
    }

    // Получаем почасовой прогноз (каждые 3 часа) для города
    async function fetchForecast(city){
      const url = `${FORECAST_URL}?q=${encodeURIComponent(city)}&appid=${API_KEY}`;
      const res = await fetch(url);
      if(!res.ok){
        const data = await res.json().catch(()=>null);
        const message = data && data.message ? data.message : `Ошибка: ${res.status}`;
        throw new Error(message);
      }
      const data = await res.json();
      return data; // содержит list[] 
    }

    // --- Рендеринг данных на страницу ---
    function renderCurrent(data){
      // data — объект текущей погоды от OpenWeather
      const city = data.name;
      const country = data.sys && data.sys.country ? data.sys.country : '';
      const tempC = kelvinToCelsius(data.main.temp);
      const desc = data.weather && data.weather[0] ? data.weather[0].description : '';
      const icon = data.weather && data.weather[0] ? data.weather[0].icon : null;
      const main = data.weather && data.weather[0] ? data.weather[0].main : '';

      cityNameEl.textContent = `${city}${country ? ', ' + country : ''}`;
      descEl.textContent = capitalize(desc);
      tempEl.textContent = `${tempC}°C`;
      humidityEl.textContent = data.main.humidity;
      windEl.textContent = (data.wind && data.wind.speed) ? data.wind.speed : '-';
      setWeatherIcon(icon, main);
    }


function renderForecast(forecastData){
  forecastGrid.innerHTML = '';
  const list = forecastData.list; // массив прогнозов
  const tz = forecastData.city && forecastData.city.timezone ? forecastData.city.timezone : 0; // смещение в секундах

//  Сравниваем в локальном времени города
const nowCity = new Date((Math.floor(Date.now() / 1000) + tz) * 1000);
const cityYear = nowCity.getFullYear();
const cityMonth = nowCity.getMonth();
const cityDate = nowCity.getDate();

console.log('=== ОБРАБОТКА ДАННЫХ ДЛЯ СЕГОДНЯШНЕГО ДНЯ ===');
console.log('Часовой пояс (секунды):', tz);
console.log('Всего элементов в прогнозе:', list.length);

console.log('Сегодняшняя дата в UTC:', `${cityDate}.${cityMonth + 1}.${cityYear}`);

// Перебираем все элементы списка
list.forEach((item, index) => {
    // Преобразуем время элемента в локальное время города
    const dtUtc = item.dt; // UNIX timestamp в UTC
    const cityTime = new Date((dtUtc ) * 1000);    
    const itemYear = cityTime.getFullYear();
    const itemMonth = cityTime.getMonth();
    const itemDate = cityTime.getDate();
    const itemHours = cityTime.getHours();
   
    // Проверяем
    const isToday = itemYear === cityYear && 
                   itemMonth === cityMonth && 
                   itemDate === cityDate ;
    
    // Обрабатываем 
    if (isToday) {
        
        // Создаем элемент для отображения
        const slot = document.createElement('div');
        slot.className = 'slot';
        
        // Время
        const hourLabel = document.createElement('div');
        hourLabel.className = 'hour';
        hourLabel.textContent = `${itemHours}:00`;
        slot.appendChild(hourLabel);
        
        // Иконка погоды
        const icon = item.weather && item.weather[0] ? item.weather[0].icon : null;
        const main = item.weather && item.weather[0] ? item.weather[0].main : '';
        
        const iconImg = document.createElement('div');
        iconImg.innerHTML = icon ? `<img src="https://openweathermap.org/img/wn/${icon}.png" alt="${main}"/>` : '';
        slot.appendChild(iconImg);
        
        // Температура
        const t = kelvinToCelsius(item.main.temp);
        const tEl = document.createElement('div');
        tEl.className = 'slot-temp';
        tEl.textContent = `${t}°C`;
        slot.appendChild(tEl);
        
        // Описание погоды
        const dEl = document.createElement('div');
        dEl.className = 'muted';
        dEl.textContent = item.weather && item.weather[0] ? capitalize(item.weather[0].description) : '';
        slot.appendChild(dEl);
        
        // Добавляем в контейнер
        forecastGrid.appendChild(slot);
    }
});

  }

    // --- Главная функция: делает запросы и обновляет UI ---
    async function searchCity(city, {save=true} = {}){
      if(!city || city.trim().length === 0){
        showError('Пожалуйста, введите название города.');
        return;
      }
      clearError();
      searchBtn.disabled = true;
      searchBtn.textContent = 'Загрузка...';

      try{
        // Получаем текущую погоду и прогноз параллельно
        const [current, forecast] = await Promise.all([
          fetchCurrentWeather(city),
          fetchForecast(city)
        ]);

        // Рендерим
        renderCurrent(current);
        renderForecast(forecast);

        // Сохраняем последний город в localStorage
        if(save) saveLastCity(city);

      }catch(err){
        // Обработка ошибок 
        showError('Ошибка при получении данных: ' + err.message);
        // Очистим отображение
        cityNameEl.textContent = '—';
        descEl.textContent = '—';
        tempEl.textContent = '—';
        humidityEl.textContent = '—';
        windEl.textContent = '—';
        weatherIconEl.innerHTML = '—';
        forecastGrid.innerHTML = '';
      }finally{
        searchBtn.disabled = false;
        searchBtn.textContent = 'Поиск';
      }
    }

    // --- События UI ---
    searchBtn.addEventListener('click', () => {
      const city = cityInput.value.trim();
      searchCity(city);
    });

    // По Enter в поле ввода тоже запускаем поиск
    cityInput.addEventListener('keydown', (e) => {
      if(e.key === 'Enter'){
        searchBtn.click();
      }
    });

    // Кнопка сохранить 
    saveBtn.addEventListener('click', () => {
      const city = cityInput.value.trim();
      if(!city) return showError('Нечего сохранять. Введите название города.');
      saveLastCity(city);
      saveBtn.textContent = 'Сохранено ✔';
      setTimeout(()=>saveBtn.textContent = '💾 Сохранить', 1200);
    });

    // При загрузке страницы — пробуем загрузить последний город из localStorage
    window.addEventListener('load', () => {
      const last = loadLastCity();
      if(last){
        cityInput.value = last;
        // Автоматический запрос при загрузке 
        searchCity(last, {save:false});
      }
    });
