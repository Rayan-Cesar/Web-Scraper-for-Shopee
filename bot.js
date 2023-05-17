// CREATE TABLE products(
//     ID   INT AUTO_INCREMENT,
//     href  VARCHAR (255) NOT NULL,
//     name VARCHAR (255) NOT NULL,
//     old_price  DECIMAL(10,2),
//     new_price1  DECIMAL(10,2) NOT NULL,
//     new_price2  DECIMAL(10,2),
//     discount_percent  INT (3) NOT NULL,
//     sales_qtd  INT (20) NOT NULL,
//     link_img_1   VARCHAR (255) NOT NULL,
//     link_img_2   VARCHAR (255),
//     link_img_3   VARCHAR (255),
//     global_category   VARCHAR (255) NOT NULL,   
//     specific_category   VARCHAR (255),
//     dt DATETIME NOT NULL,
//     PRIMARY KEY (ID)
// );

const puppeteer = require('puppeteer');
var mysql = require('mysql');
var connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "apl_db"
});

const cron = require('node-cron');
const fs = require('fs');
const { JSDOM } = require('jsdom');
const login = require('./login.js');
const convert = require('./convert.js');
const post = require('./post.js');


const num_pages = 0; // Define o número de páginas a serem acessadas

const shopee_links = [
    { category: 'Casa&Decoração', link: 'https://shopee.com.br/Casa-e-Decora%C3%A7%C3%A3o-cat.11059983?filters=8%2C10&maxPrice=30&minPrice=0&ratingFilter=4&sortBy=pop', qtd_add_product: 1 }, //frete gratis 1 2 itens
    { category: 'Casa&Decoração', link: 'https://shopee.com.br/Casa-e-Decora%C3%A7%C3%A3o-cat.11059983?filters=8%2C10&maxPrice=30&minPrice=29&pLabelIds=1012687&ratingFilter=4&sortBy=pop', qtd_add_product: 1 }, //rand 1
    { category: 'SapatosFemininos', link: 'https://shopee.com.br/Sapatos-Femininos-cat.11059999?filters=8%2C10&minPrice=29&pLabelIds=1012687&ratingFilter=4&sortBy=pop', qtd_add_product: 1 }, // frete gratis
    { category: 'RoupasFemininas', link: 'https://shopee.com.br/Roupas-Femininas-cat.11059998?filters=8%2C10&minPrice=29&pLabelIds=1012687&ratingFilter=4&sortBy=pop', qtd_add_product: 1 }, // frete gratis
    { category: 'Celular&Dispositivos', link: 'https://shopee.com.br/Celulares-e-Dispositivos-cat.11059988?filters=8%2C10&ratingFilter=4&sortBy=pop', qtd_add_product: 1 }, //rand 1
    { category: 'Celular&Dispositivos', link: 'https://shopee.com.br/Celulares-e-Dispositivos-cat.11059988?filters=8%2C10&minPrice=29&pLabelIds=1012687&ratingFilter=4&sortBy=pop', qtd_add_product: 1 }, //frete gratis 1
    { category: 'Eletroportateis', link: 'https://shopee.com.br/Eletroport%C3%A1teis-cat.11059984?filters=8%2C10&minPrice=29&pLabelIds=1012687&ratingFilter=4&sortBy=pop', qtd_add_product: 1 }, //frete gratis 1 ta feito
    { category: 'Computadores&Acessorios', link: 'https://shopee.com.br/Computadores-e-Acess%C3%B3rios-cat.11059977?filters=8%2C10&ratingFilter=4&sortBy=pop', qtd_add_product: 1 }, // rand 1
    { category: 'Papelaria', link: 'https://shopee.com.br/Papelaria-cat.11059993?filters=8%2C10&ratingFilter=4&sortBy=pop', qtd_add_product: 1 }, // rand 1
    { category: 'Pet', link: 'https://shopee.com.br/Animais-Dom%C3%A9sticos-cat.11059991?filters=8%2C10&ratingFilter=4&sortBy=pop', qtd_add_product: 1 }, //rand 1
    { category: 'Pet', link: 'https://shopee.com.br/Animais-Dom%C3%A9sticos-cat.11059991?filters=8%2C10&minPrice=29&pLabelIds=1012687&ratingFilter=4&sortBy=pop', qtd_add_product: 1 }, //frete 1
    { category: 'Beleza', link: 'https://shopee.com.br/Beleza-cat.11059974?filters=10%2C8&maxPrice=30&minPrice=0&ratingFilter=4&sortBy=pop', qtd_add_product: 2 }
  ];

async function removeElement(page, selector) {
    try {
        await page.waitForSelector(selector, { timeout: 10000 });
        const element = await page.$(selector);
        if (element) {
        await element.evaluate(element => element.remove())
        }
    } catch (error) {
        // Seletor não encontrado - não fazer nada
    }
}


async function scrollPage(page) {
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      let totalHeight = 0;
      let distance = 100;
      let timer = setInterval(() => {
        let scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}
  
async function search_products(shopee_link_category) {

    const page = await login.login();
    

    for (let i = 0; i <= num_pages; i++) {
        const page_url = shopee_link_category.link + '&page=' + i;

        console.log(`Processando página ${i + 1}`);

        console.log('Procurando Produtos de '+shopee_link_category.category+'!');

        await page.goto(page_url, { waitUntil: 'networkidle0' }); // Acessa a página

        await removeElement(page, '.zsav9a');
        
        await scrollPage(page);

        try{
            await page.waitForFunction(`document.querySelectorAll('.shopee-search-item-result__item').length >= 20`, { timeout: 30000 }); // pega info de 20 produtos
        }catch{
            await search_products(shopee_link_category);
        }

        await page.waitForTimeout(10000);

        let productDivs = await page.evaluate(() => {
            const items = document.querySelectorAll('.shopee-search-item-result__item');
            let productDivs = [];
            for (let item of items) {
              if (item.querySelector('a')) {
                const image = item.querySelector('.B0Ze3i').src;
                if (image != null && image != '') {
                  productDivs.push(item.outerHTML);
                }
              }
            }
            return productDivs;
          });
        
        //await page.close();

        await list_products(shopee_link_category, productDivs, page);
    }
}

async function start() {
    for (let i = 0; i < shopee_links.length; i++) {
      await search_products(shopee_links[i]);
  
      await new Promise(resolve => {
        setTimeout(resolve, 5 * 60 * 1000);
      });
    }
    await start();
}

function get_dataFormatada() {
    const dataAtual = new Date();
    return dataAtual.getFullYear() + '-' +
        (dataAtual.getMonth() + 1).toString().padStart(2, '0') + '-' +
        dataAtual.getDate().toString().padStart(2, '0') + ' ' +
        dataAtual.getHours().toString().padStart(2, '0') + ':' +
        dataAtual.getMinutes().toString().padStart(2, '0') + ':' +
        dataAtual.getSeconds().toString().padStart(2, '0');
}

async function list_products(shopee_link_category, productDivs, page) {
    const parsedProducts = productDivs.map(productHTML => {
        const productDiv = new JSDOM(productHTML).window.document.querySelector('.shopee-search-item-result__item');
        const link = "https://shopee.com.br" + productDiv.querySelector('a').href;
        const name = productDiv.querySelector('._1yN94N')?.textContent ?? '';
        const percent_discount = productDiv.querySelector('.percent')?.textContent?.replace('%', '') ?? '0';
        const oldPriceElements = productDiv.querySelectorAll('._90eCxb');
        const oldPrice = oldPriceElements.length > 0 ? [...oldPriceElements].map(price => parseFloat(price.textContent.split(' - ')[0].replace('R$', '').replace(',', '.')).toFixed(2)) : null;
        const [newPrice1, newPrice2] = productDiv.querySelector('.MUmBjS')?.textContent?.split(' - ')?.map(price => parseFloat(price.replace('R$', '').replace(',', '.')).toFixed(2)) ?? [null, null];
        const sales_qtd_raw = productDiv.querySelector('.tysB0L')?.textContent ?? '0';
        const sales_qtd_match = sales_qtd_raw.match(/(\d+(\.\d+)?)/); // extrai apenas os números
        const sales_qtd = sales_qtd_match ? parseFloat(sales_qtd_match[0].replace('.', '')) * (sales_qtd_raw.includes('mil') ? 1000 : 1) : 0;
        const divElement = productDiv.querySelector('div._8UN9uK div[style="pointer-events: none;"]');
        divElement.style.pointerEvents = "auto";
        const img = productDiv.querySelector('.B0Ze3i')?.src ?? '';
        const global_category = shopee_link_category.link;
        const specifc_category = shopee_link_category.category;
        return img ? { link, name, percent_discount, oldPrice, newPrice1, newPrice2, sales_qtd, img, global_category, specifc_category, page } : null;
    });

    async function insertProductIntoDB(product) {
        const sql_insert = `INSERT INTO products (href, name, old_price, new_price1, new_price2, discount_percent, sales_qtd, link_img_1, global_category, specific_category, dt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const params = [
            product.link,
            product.name,
            product.oldPrice,
            product.newPrice1,
            product.newPrice2,
            product.percent_discount,
            product.sales_qtd,
            product.img,
            product.global_category,
            product.specifc_category,
            get_dataFormatada()
        ];
        connection.query(sql_insert, params, (error, results, fields) => {
            if (error) {
                console.error("Error inserting product into database:", error);
            } else {
                console.log("Product inserted successfully:", product.name);
            }
        });
    }

    async function checkProductExistsInDB(link) {
        const escapedLink = connection.escape(link);
        const sql_search = `SELECT href FROM products WHERE href = ${escapedLink}`;
        connection.query(sql_search, (error, results) => {
            if (error) {
                return true;
            } else {
                return false;
            }
        });
    }

    async function imgs(shopee_af_link){
        let list_link_imgs = [];
        console.log('Carregando Pagina do Produto e pegando o link das imagens!');

        await page.goto(shopee_af_link, { waitUntil: 'networkidle0' }); // Acessa a página
        await page.waitForTimeout(10000);
        try{
            const videoElement = await page.$('video._82gzM6');
            const videoSrc = await videoElement.getProperty('src');
            const src = await videoSrc.jsonValue();
            if (src.startsWith("https://")){
                list_link_imgs.push(src);
            }
        }catch{
            console.log("Esse produto não tem video!");
        }

        const elementHandles = await page.$$('.MTpc1O .MZ9yDd .A4dsoy');
        for (let elementHandle of elementHandles) {
            const style = await page.evaluate(element => window.getComputedStyle(element).getPropertyValue('background-image'), elementHandle);
            if (style[1] != null){
                let src = style.match(/url\("?(.+?)"?\)/)[1];
                src = src.replace("_tn", "");
                if (src.startsWith("https://")){
                    list_link_imgs.push(src);
                }
            }
        }
        //await page.screenshot({ path: 'img.png' });
        return list_link_imgs;
    }

    async function selectBestSellingProduct(products, maxSalesProducts) {
        const selectedProducts = [];
        const filteredProducts = products.filter(product => product.percent_discount > 5);
        filteredProducts.sort((a, b) => parseFloat(b.sales_qtd) - parseFloat(a.sales_qtd));
        for (let i = 0; i < filteredProducts.length; i++) {
            const product = filteredProducts[i];
            const existsInDB = await checkProductExistsInDB(product.link);
            if (!existsInDB && selectedProducts.length < maxSalesProducts) {
                product.link = await convert.convert_link(product.link, page);
                console.log(product.link);
                const list_video_imgs_product = await imgs(product.link);
                console.log(list_video_imgs_product);
                try {
                    const download_list = await post.download(list_video_imgs_product);
                    console.log(download_list)
                  } catch (err) {
                    console.log(err)
                  }
                  
                try{
                    await post.post(download_list, product.name, product.percent_discount, product.oldPrice, product.newPrice1);
                } catch (error) {
                    console.error(error);
                }
                await insertProductIntoDB(product);
                //selectedProducts.push(product);
            }
        }
    }
    
    await selectBestSellingProduct(parsedProducts, shopee_link_category.qtd_add_product, page).then(selectedProducts => {
        //console.log(selectedProducts);
    });
}

start();


