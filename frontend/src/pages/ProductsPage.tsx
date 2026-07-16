import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
} from '@mui/material';
import Layout from '@components/Layout';
import { apiClient } from '../services/api';

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    price: '',
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await apiClient.get('/products');
      setProducts(response.data.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleOpenDialog = (product?: any) => {
    if (product) {
      setSelectedProduct(product);
      setFormData({
        name: product.name,
        description: product.description || '',
        category: product.category || '',
        price: product.price?.toString() || '',
      });
    } else {
      setSelectedProduct(null);
      setFormData({
        name: '',
        description: '',
        category: '',
        price: '',
      });
    }
    setOpenDialog(true);
  };

  const handleSave = async () => {
    try {
      if (selectedProduct) {
        const response = await apiClient.patch(`/products/${selectedProduct.id}`, formData);
        setProducts(products.map((p) => (p.id === selectedProduct.id ? response.data.data : p)));
      } else {
        const response = await apiClient.post('/products', formData);
        setProducts([...products, response.data.data]);
      }
      setOpenDialog(false);
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  const handleDelete = async (productId: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await apiClient.delete(`/products/${productId}`);
        setProducts(products.filter((p) => p.id !== productId));
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">Product Masters</Typography>
          <Button variant="contained" onClick={() => handleOpenDialog()}>
            Add Product
          </Button>
        </Box>

        {products.length === 0 ? (
          <Card>
            <CardContent>
              <Typography color="textSecondary">No products yet</Typography>
            </CardContent>
          </Card>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Product Name</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell sx={{ fontWeight: 'bold' }}>{product.name}</TableCell>
                    <TableCell>{product.category || '-'}</TableCell>
                    <TableCell align="right">${product.price ? parseFloat(product.price).toFixed(2) : '0.00'}</TableCell>
                    <TableCell>{product.description || '-'}</TableCell>
                    <TableCell>
                      <Button size="small" variant="text" onClick={() => handleOpenDialog(product)}>
                        Edit
                      </Button>
                      <Button size="small" variant="text" color="error" onClick={() => handleDelete(product.id)}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{selectedProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Product Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              sx={{ mb: 2 }}
              required
            />
            <TextField
              fullWidth
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Price"
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              sx={{ mb: 2 }}
              inputProps={{ step: '0.01' }}
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} variant="contained">
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
};
