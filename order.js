git add .
git commit -m "Add order API"
git push origin main

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const data = await request.json();

    const { name, email, phone, product, amount } = data;

    await env.DB.prepare(`
      INSERT INTO orders (user_id, product_id, amount, payment_status)
      VALUES (?, ?, ?, ?)
    `)
      .bind(
        null,
        product,
        amount,
        "pending"
      )
      .run();

    return Response.json({
      success: true,
      message: "Order berjaya disimpan."
    });

  } catch (err) {
    return Response.json({
      success: false,
      error: err.message
    }, { status: 500 });
  }
}